const attendanceRepository = require('../repositories/attendance.repository');

const list = (centerId?: number, teacherId?: number) => attendanceRepository.findAll(centerId, teacherId);

const getById = (id: number, centerId?: number, teacherId?: number) => attendanceRepository.findById(id, centerId, teacherId);

const create = async (body: any, centerId?: number) => {
  const { student_id, teacher_id, class_id, attendance_date, status, remarks, session_id } = body;
  const resolvedCenterId = centerId ?? body.center_id;
  if (resolvedCenterId) {
    const [studentOk, classOk] = await Promise.all([
      attendanceRepository.studentInCenter(student_id, resolvedCenterId),
      attendanceRepository.classInCenter(class_id, resolvedCenterId),
    ]);
    if (!studentOk || !classOk) return { error: 'invalid_center' as const };
  }
  return attendanceRepository.insert([
    resolvedCenterId,
    student_id,
    teacher_id,
    class_id,
    session_id ?? null,
    attendance_date,
    status || 'Present',
    remarks,
  ]);
};

const update = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { status, remarks } = body;
  return attendanceRepository.update(id, [status, remarks], centerId, teacherId);
};

const byStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  attendanceRepository.findByStudent(studentId, centerId, teacherId);

const byClass = (classId: number, centerId?: number, teacherId?: number) =>
  attendanceRepository.findByClass(classId, centerId, teacherId);

const bySession = (sessionId: number, centerId?: number, teacherId?: number) =>
  attendanceRepository.findBySession(sessionId, centerId, teacherId);

const remove = (id: number, centerId?: number, teacherId?: number) => attendanceRepository.remove(id, centerId, teacherId);

module.exports = { list, getById, create, update, byStudent, byClass, bySession, remove };

export {};
