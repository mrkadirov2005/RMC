type ClassStudentRecord = {
  student_id?: number;
  id?: number;
};

export const getClassStudentId = (student: ClassStudentRecord) =>
  Number(student.student_id || student.id || 0);

export const removeClassStudentById = <T extends ClassStudentRecord>(students: T[], studentId: number) =>
  students.filter((student) => getClassStudentId(student) !== studentId);
