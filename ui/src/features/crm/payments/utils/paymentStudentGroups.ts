import type { Class, Student } from '../types';

export interface PaymentStudentGroupOption {
  studentId: number;
  groupName: string;
  amount?: number;
}

const normalizeName = (student: Student) =>
  `${student.first_name || ''} ${student.last_name || ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '');

const identifiersMatch = (first: Student, second: Student) => {
  const firstBirthDate = String(first.date_of_birth || '').slice(0, 10);
  const secondBirthDate = String(second.date_of_birth || '').slice(0, 10);
  const firstPhone = normalizePhone(first.phone);
  const secondPhone = normalizePhone(second.phone);
  const hasFirstIdentifier = Boolean(firstBirthDate || firstPhone);
  const hasSecondIdentifier = Boolean(secondBirthDate || secondPhone);

  if (!hasFirstIdentifier || !hasSecondIdentifier) {
    return !hasFirstIdentifier && !hasSecondIdentifier;
  }

  return Boolean(
    (firstBirthDate && secondBirthDate && firstBirthDate === secondBirthDate) ||
    (firstPhone && secondPhone && firstPhone === secondPhone)
  );
};

export const getPaymentStudentGroupOptions = (
  selectedStudent: Student | undefined,
  students: Student[],
  classes: Class[]
): PaymentStudentGroupOption[] => {
  if (!selectedStudent) return [];
  const selectedName = normalizeName(selectedStudent);
  if (!selectedName) return [];

  const classesById = new Map(
    classes.map((classItem) => [
      Number(classItem.class_id || classItem.id),
      classItem,
    ])
  );

  const options = students
    .filter((student) => {
      const studentId = Number(student.student_id || student.id || 0);
      return studentId > 0 &&
        normalizeName(student) === selectedName &&
        identifiersMatch(selectedStudent, student);
    })
    .map((student) => {
      const studentId = Number(student.student_id || student.id || 0);
      const classId = Number(student.class_id || 0);
      const classItem = classesById.get(classId);
      const groupName = String(classItem?.class_name || student.class_name || '').trim();
      return {
        studentId,
        groupKey: classId > 0 ? `id:${classId}` : `name:${groupName.toLowerCase()}`,
        groupName: groupName || (classId > 0 ? `Group #${classId}` : ''),
        amount: Number(classItem?.payment_amount || 0) || undefined,
      };
    })
    .filter((option) => option.groupName);
  const optionsByGroup = new Map<string, (typeof options)[number]>();
  for (const option of options) {
    const existing = optionsByGroup.get(option.groupKey);
    if (!existing || option.studentId === Number(selectedStudent.student_id || selectedStudent.id || 0)) {
      optionsByGroup.set(option.groupKey, option);
    }
  }
  return Array.from(optionsByGroup.values())
    .map(({ groupKey: _groupKey, ...option }) => option)
    .sort((a, b) => a.groupName.localeCompare(b.groupName));
};
