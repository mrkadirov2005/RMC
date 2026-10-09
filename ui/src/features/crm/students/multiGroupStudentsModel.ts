import type { Student } from './types';

export interface MultiGroupStudent {
  key: string;
  name: string;
  groups: Array<{ key: string; name: string; teacherId: number | null; subjects: string }>;
}

const normalizeText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

const normalizePhone = (value: unknown) => String(value || '').replace(/\D/g, '');

export const getMultiGroupStudents = (students: Student[]): MultiGroupStudent[] => {
  const parents = students.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) parents[secondRoot] = firstRoot;
  };
  const studentsByName = new Map<string, number[]>();

  // Records linked to one main record are the same child for certain, whatever their names say.
  const indexById = new Map<number, number>();
  students.forEach((student, index) => {
    const studentId = Number(student.student_id || student.id || 0);
    if (studentId) indexById.set(studentId, index);
  });
  students.forEach((student, index) => {
    const mainIndex = indexById.get(Number(student.main_student_id || 0));
    if (mainIndex !== undefined) union(index, mainIndex);
  });

  students.forEach((student, index) => {
    const normalizedName = normalizeText(`${student.first_name || ''} ${student.last_name || ''}`);
    if (!normalizedName) return;
    studentsByName.set(normalizedName, [...(studentsByName.get(normalizedName) || []), index]);
  });

  for (const indices of studentsByName.values()) {
    const recordsByIdentifier = new Map<string, number>();
    for (const index of indices) {
      const student = students[index];
      const dateOfBirth = String(student.date_of_birth || '').trim().slice(0, 10);
      const phone = normalizePhone(student.phone);
      const identifiers = [
        ...(dateOfBirth ? [`dob:${dateOfBirth}`] : []),
        ...(phone ? [`phone:${phone}`] : []),
        ...(!dateOfBirth && !phone ? ['no-identifier'] : []),
      ];
      for (const identifier of identifiers) {
        const existingIndex = recordsByIdentifier.get(identifier);
        if (existingIndex === undefined) recordsByIdentifier.set(identifier, index);
        else union(index, existingIndex);
      }
    }
  }

  const people = new Map<number, { name: string; groups: Map<string, { key: string; name: string; teacherId: number | null; subjects: string }> }>();
  students.forEach((student, index) => {
    const personId = find(index);
    const name = [student.first_name, student.last_name].map((part) => String(part || '').trim()).filter(Boolean).join(' ');
    const person = people.get(personId) || { name: name || `Student ${student.student_id || student.id || ''}`, groups: new Map() };
    const classId = Number(student.class_id || 0);
    const className = String(student.class_name || '').trim();
    if (classId > 0 || className) {
      const groupKey = classId > 0 ? `id:${classId}` : `name:${normalizeText(className)}`;
      const groupLabel = className || `Group #${classId}`;
      const teacherId = Number(student.effective_teacher_id || student.class_teacher_id || student.teacher_id || 0) || null;
      person.groups.set(groupKey, { key: groupKey, name: groupLabel, teacherId, subjects: String(student.class_subjects || '').trim() });
    }
    people.set(personId, person);
  });

  return Array.from(people.entries())
    .filter(([, person]) => person.groups.size > 1)
    .map(([id, person]) => ({
      key: String(id),
      name: person.name,
      groups: Array.from(person.groups.values()).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};
