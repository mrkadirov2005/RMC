import type { Attendance, Student, AttendanceFolderSelection } from './types';

export const getStudentIdsForTeacher = (students: Student[], teacherId: number): number[] =>
  students
    .filter((student) => student.teacher_id === teacherId)
    .map((student) => student.student_id || student.id || 0);

export const getStudentIdsForClass = (students: Student[], classId: number): number[] =>
  students
    .filter((student) => student.class_id === classId)
    .map((student) => student.student_id || student.id || 0);

export const getAttendanceCountForTeacher = (
  attendance: Attendance[],
  students: Student[],
  teacherId: number
): number => {
  const studentIds = getStudentIdsForTeacher(students, teacherId);
  return attendance.filter((record) => studentIds.includes(record.student_id)).length;
};

export const getAttendanceCountForClass = (
  attendance: Attendance[],
  students: Student[],
  classId: number
): number => {
  const studentIds = getStudentIdsForClass(students, classId);
  return attendance.filter((record) => studentIds.includes(record.student_id)).length;
};

export const getPresentCountForClass = (
  attendance: Attendance[],
  students: Student[],
  classId: number
): number => {
  const studentIds = getStudentIdsForClass(students, classId);
  return attendance.filter((record) => studentIds.includes(record.student_id) && record.status === 'Present').length;
};

export const getPresentCountForStudent = (
  attendance: Attendance[],
  studentId: number
): number => attendance.filter((record) => record.student_id === studentId && record.status === 'Present').length;

export const getAttendanceCountForStudent = (
  attendance: Attendance[],
  studentId: number
): number => attendance.filter((record) => record.student_id === studentId).length;

export const getFilteredAttendance = (
  attendance: Attendance[],
  students: Student[],
  selectedFolder: AttendanceFolderSelection | null
): Attendance[] => {
  if (!selectedFolder) return attendance;

  let studentIds: number[] = [];
  if (selectedFolder.type === 'teacher') {
    studentIds = getStudentIdsForTeacher(students, selectedFolder.id);
  } else if (selectedFolder.type === 'class') {
    studentIds = getStudentIdsForClass(students, selectedFolder.id);
  } else if (selectedFolder.type === 'student') {
    studentIds = [selectedFolder.id];
  }

  return attendance.filter((record) => studentIds.includes(record.student_id));
};

export const getStatusBadgeClasses = (status: string): string => {
  switch (status) {
    case 'Present':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Absent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Late':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Excused':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const getStudentName = (students: Student[], studentId: number): string => {
  const student = students.find((item) => (item.student_id || item.id) === studentId);
  return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
};

