const attendanceService = require('../../attendance/services/attendance.service');
const gradeService = require('../../grades/services/grade.service');
const debtService = require('../../debts/services/debt.service');
const paymentService = require('../../payments/services/payment.service');
const studentService = require('../../students/services/student.service');
const classService = require('../../classes/services/class.service');
const subjectService = require('../../subjects/services/subject.service');
const teacherService = require('../../teachers/services/teacher.service');
const testService = require('../../tests/services/test.service');
const assignmentService = require('../../assignments/services/assignment.service');
const roomsRepository = require('../../rooms/repositories/rooms.repository');

const safeDashboardSection = async (name: string, fallback: any, loader: () => Promise<any>) => {
  try {
    return await loader();
  } catch (error: any) {
    console.error(`Error loading student dashboard ${name}:`, error?.message || error);
    return fallback;
  }
};

// A child in several groups has one record per group, all linked to the record they log in
// with. Each portal view combines every linked record; with no links this is just the
// logged-in record, so single-group students see exactly what they saw before.
const loadLinkedRecords = async (student: any, centerId: number) => {
  const linked = await safeDashboardSection('linked groups', [], () => studentService.listLinkedGroups(student.student_id, centerId));
  return Array.isArray(linked) && linked.length > 0 ? linked : [{ ...student, is_main: true }];
};

const loadLinkedIds = async (studentId: number, centerId: number): Promise<number[]> => {
  const linked = await safeDashboardSection('linked groups', [], () => studentService.listLinkedGroups(studentId, centerId));
  const ids = Array.isArray(linked) ? linked.map((row: any) => Number(row.student_id)) : [];
  return ids.length > 0 ? ids : [studentId];
};

const recordDate = (row: any) =>
  String(row?.attendance_date || row?.payment_date || row?.date || row?.due_date || row?.created_at || '');

// One request per linked record, merged newest first. A single record keeps its own order.
const collectForRecords = async (name: string, ids: number[], loader: (id: number) => Promise<any>) => {
  const results = await Promise.all(ids.map((id) => safeDashboardSection(name, [], () => loader(id))));
  const rows = results.flatMap((result: any) => (Array.isArray(result) ? result : []));
  return ids.length > 1 ? rows.sort((a: any, b: any) => recordDate(b).localeCompare(recordDate(a))) : rows;
};

const uniqueBy = (rows: any[], key: (row: any) => unknown) => {
  const seen = new Set();
  return rows.filter((row) => {
    const value = key(row);
    if (value == null) return true;
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const getDashboardData = async (req: any, res: any) => {

  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;

    // Fetch initial student data to get class_id if not in token
    const student = await studentService.getStudent(studentId, centerId);
    if (!student) return res.status(404).json({ error: "O'quvchi topilmadi" });

    const records = await loadLinkedRecords(student, centerId);
    const ids = records.map((record: any) => Number(record.student_id));
    // Transferred-out group records keep their history in the portal but no longer add a class.
    const activeRecords = records.filter((record: any) => record.status !== 'Transferred' && record.class_id);

    // Fetch optional dashboard sections in parallel. A failure in one widget
    // should not block the rest of the student portal from loading.
    const [attendance, grades, debts, payments, tests, assignments, groups] = await Promise.all([
      collectForRecords('attendance', ids, (id) => attendanceService.byStudent(id, centerId)),
      collectForRecords('grades', ids, (id) => gradeService.listByStudent(id, centerId)),
      collectForRecords('debts', ids, (id) => debtService.listByStudent(id, centerId)),
      collectForRecords('payments', ids, (id) => paymentService.listByStudent(id, centerId)),
      collectForRecords('tests', ids, (id) => testService.getAssignedTests('student', id, centerId)),
      safeDashboardSection('assignments', [], () => assignmentService.getAllAssignments(centerId)),
      Promise.all(activeRecords.map(async (record: any) => {
        const classId = record.class_id;
        const teacherId = record.student_id === student.student_id ? student.teacher_id : record.effective_teacher_id || record.teacher_id;
        const [classInfo, subjects, teacher, schedule] = await Promise.all([
          safeDashboardSection('class info', null, () => classService.getClass(classId, centerId)),
          safeDashboardSection('subjects', [], () => subjectService.listByClass(classId, centerId)),
          teacherId ? safeDashboardSection('teacher', null, () => teacherService.getTeacher(teacherId, centerId)) : Promise.resolve(null),
          safeDashboardSection('schedule', [], () => roomsRepository.findByClassId(classId, centerId)),
        ]);
        return {
          student_id: record.student_id,
          class_id: classId,
          class_name: record.class_name ?? classInfo?.class_name ?? null,
          is_main: Boolean(record.is_main),
          classInfo,
          subjects,
          teacher,
          schedule,
        };
      })),
    ]);

    // The logged-in record's group stays the primary one for the existing single-group fields.
    const primaryGroup = groups.find((group: any) => group.student_id === student.student_id) || groups[0] || null;
    const classIds = new Set(groups.map((group: any) => Number(group.class_id)));
    const filteredAssignments = (assignments || []).filter((a: any) => classIds.has(Number(a.class_id)));
    const totalCoins = records.length > 1
      ? records.reduce((sum: number, record: any) => sum + Number(record.coins || 0), 0)
      : student.coins;

    res.json({
      student: { ...student, coins: totalCoins },
      attendance,
      grades,
      debts,
      payments,
      tests: uniqueBy(tests, (test: any) => test?.test_id ?? test?.id),
      assignments: filteredAssignments,
      classInfo: primaryGroup?.classInfo ?? null,
      subjects: groups.flatMap((group: any) => (Array.isArray(group.subjects) ? group.subjects : [])),
      teacher: primaryGroup?.teacher ?? null,
      schedule: groups.flatMap((group: any) => (Array.isArray(group.schedule) ? group.schedule : [])),
      groups,
    });

  } catch (error: any) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ error: "Boshqaruv paneli ma'lumotlarini yuklab bo'lmadi" });
  }
};

const getMyAttendance = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const ids = await loadLinkedIds(studentId, centerId);
    const records = ids.length > 1
      ? await collectForRecords('attendance', ids, (id) => attendanceService.byStudent(id, centerId))
      : await attendanceService.byStudent(studentId, centerId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getMyGrades = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const ids = await loadLinkedIds(studentId, centerId);
    const records = ids.length > 1
      ? await collectForRecords('grades', ids, (id) => gradeService.listByStudent(id, centerId))
      : await gradeService.listByStudent(studentId, centerId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getMyTests = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const ids = await loadLinkedIds(studentId, centerId);
    const tests = ids.length > 1
      ? uniqueBy(await collectForRecords('tests', ids, (id) => testService.getAssignedTests('student', id, centerId)), (test: any) => test?.test_id ?? test?.id)
      : await testService.getAssignedTests('student', studentId, centerId);
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getMySchedule = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;

    const student = await studentService.getStudent(studentId, centerId);
    if (!student || !student.class_id) return res.json([]);

    const records = await loadLinkedRecords(student, centerId);
    const classIds = Array.from(new Set(
      records.filter((record: any) => record.status !== 'Transferred' && record.class_id).map((record: any) => Number(record.class_id))
    ));
    if (classIds.length <= 1) {
      const schedule = await roomsRepository.findByClassId(student.class_id, centerId);
      return res.json(schedule);
    }
    const schedules = await Promise.all(classIds.map((classId) => roomsRepository.findByClassId(classId, centerId)));
    res.json(schedules.flat());
  } catch (error: any) {
    console.error('Error in getMySchedule:', error);
    res.status(500).json({ error: "Jadvalni yuklab bo'lmadi" });
  }
};

module.exports = {
  getDashboardData,
  getMyAttendance,
  getMyGrades,
  getMyTests,
  getMySchedule,
};


export {};
