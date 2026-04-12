import type { Class, Student } from './types';
export { getStatusVariant } from './status';

const toId = (value: unknown) => {
  const normalized = Number(value);
  return Number.isNaN(normalized) ? null : normalized;
};

export const getStudentCount = (students: Student[], classId: number) =>
  students.filter((student) => toId(student.class_id) === toId(classId)).length;

export const getFilteredStudents = (
  students: Student[],
  selectedClass: Class | null,
  searchTerm: string,
  filterGender: string,
  filterStatus: string
) => {
  const baseStudents = selectedClass?.class_id === -1
    ? students.filter((student) => !student.class_id)
    : selectedClass
      ? students.filter((student) => toId(student.class_id) === toId(selectedClass.class_id || selectedClass.id))
      : [];

  let result = baseStudents;

  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    result = result.filter((student) =>
      student.first_name?.toLowerCase().includes(search) ||
      student.last_name?.toLowerCase().includes(search) ||
      student.email?.toLowerCase().includes(search) ||
      student.phone?.includes(search) ||
      student.enrollment_number?.toLowerCase().includes(search) ||
      student.parent_name?.toLowerCase().includes(search) ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(search)
    );
  }

  if (filterGender) {
    result = result.filter((student) => student.gender === filterGender);
  }

  if (filterStatus) {
    result = result.filter((student) => student.status === filterStatus);
  }

  return result;
};
