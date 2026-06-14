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

const getDashboardData = async (req: any, res: any) => {

  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;

    // Fetch initial student data to get class_id if not in token
    const student = await studentService.getStudent(studentId, centerId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const classId = student.class_id;
    const teacherId = student.teacher_id;

    // Fetch optional dashboard sections in parallel. A failure in one widget
    // should not block the rest of the student portal from loading.
    const [
      attendance,
      grades,
      debts,
      payments,
      tests,
      assignments,
      classInfo,
      subjects,
      teacher,
      schedule,
    ] = await Promise.all([

      safeDashboardSection('attendance', [], () => attendanceService.byStudent(studentId, centerId)),
      safeDashboardSection('grades', [], () => gradeService.listByStudent(studentId, centerId)),
      safeDashboardSection('debts', [], () => debtService.listByStudent(studentId, centerId)),
      safeDashboardSection('payments', [], () => paymentService.listByStudent(studentId, centerId)),
      safeDashboardSection('tests', [], () => testService.getAssignedTests('student', studentId, centerId)),
      safeDashboardSection('assignments', [], () => assignmentService.getAllAssignments(centerId)),
      classId ? safeDashboardSection('class info', null, () => classService.getClass(classId, centerId)) : Promise.resolve(null),
      classId ? safeDashboardSection('subjects', [], () => subjectService.listByClass(classId, centerId)) : Promise.resolve([]),
      teacherId ? safeDashboardSection('teacher', null, () => teacherService.getTeacher(teacherId, centerId)) : Promise.resolve(null),
      classId ? safeDashboardSection('schedule', [], () => roomsRepository.findByClassId(classId, centerId)) : Promise.resolve([]),
    ]);


    // Filter assignments by class_id if available
    const filteredAssignments = classId 
      ? assignments.filter((a: any) => Number(a.class_id) === Number(classId))
      : [];

    res.json({
      student,
      attendance,
      grades,
      debts,
      payments,
      tests,
      assignments: filteredAssignments,
      classInfo,
      subjects,
      teacher,
      schedule,
    });

  } catch (error: any) {
    console.error('Error in getDashboardData:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

const getMyAttendance = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const records = await attendanceService.byStudent(studentId, centerId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getMyGrades = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const records = await gradeService.listByStudent(studentId, centerId);
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getMyTests = async (req: any, res: any) => {
  try {
    const studentId = req.user.id;
    const centerId = req.user.center_id;
    const tests = await testService.getAssignedTests('student', studentId, centerId);
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

    const schedule = await roomsRepository.findByClassId(student.class_id, centerId);
    res.json(schedule);
  } catch (error: any) {
    console.error('Error in getMySchedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
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
