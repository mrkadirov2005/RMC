const attendanceRepository = require('../repositories/attendance.repository');

const list = (centerId?: number, teacherId?: number) => attendanceRepository.findAll(centerId, teacherId);

const getById = (id: number, centerId?: number, teacherId?: number) => attendanceRepository.findById(id, centerId, teacherId);

const create = async (body: any, centerId?: number) => {
  const { student_id, teacher_id, class_id, attendance_date, status, remarks } = body;
  if (centerId) {
    const [studentOk, classOk] = await Promise.all([
      attendanceRepository.studentInCenter(student_id, centerId),
      attendanceRepository.classInCenter(class_id, centerId),
    ]);
    if (!studentOk || !classOk) return { error: 'invalid_center' as const };
  }
  return attendanceRepository.insert([
    student_id,
    teacher_id,
    class_id,
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

const remove = (id: number, centerId?: number, teacherId?: number) => attendanceRepository.remove(id, centerId, teacherId);

module.exports = { list, getById, create, update, byStudent, byClass, remove };

export {};
