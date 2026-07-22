// React hooks for the crm feature.

import { useMemo } from 'react';
import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';
import type { Class, Student } from '../types';

const toPositiveId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const buildClassTeacherMap = (classes: Class[]) => {
  const classTeacherMap = new Map<number, number>();
  for (const cls of classes) {
    const classId = toPositiveId(cls.class_id || cls.id);
    const teacherId = toPositiveId(cls.teacher_id);
    if (classId && teacherId) {
      classTeacherMap.set(classId, teacherId);
    }
  }
  return classTeacherMap;
};

const getStudentTeacherId = (student: Student, classTeacherMap: Map<number, number>) => {
  const classId = toPositiveId(student.class_id);
  const classTeacherId = toPositiveId(student.class_teacher_id) || (classId ? classTeacherMap.get(classId) || null : null);
  if (classTeacherId) return classTeacherId;

  const rowTeacherId = toPositiveId(student.effective_teacher_id) || toPositiveId(student.teacher_id);
  if (rowTeacherId) return rowTeacherId;

  return null;
};

// Provides students page.
export const useStudentsPage = () => {
  const filters = useStudentsFilters([]);
  const data = useStudentsData(filters.studentParams);
  const modal = useStudentsModal(filters.selectedClass, data.actions.fetchAll);
  const classTeacherMap = useMemo(() => buildClassTeacherMap(data.classes), [data.classes]);
  const displayedStudents = useMemo(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    if (!teacherId) return data.state.items;
    return data.state.items.filter((student) => getStudentTeacherId(student, classTeacherMap) === teacherId);
  }, [classTeacherMap, data.state.items, filters.filterTeacherId]);

  return {
    ...data,
    ...filters,
    ...modal,
    displayedStudents,
    genderOptions: [
      { id: 1, label: 'Male', value: 'Male' },
      { id: 2, label: 'Female', value: 'Female' },
      { id: 3, label: 'Other', value: 'Other' },
    ],
    statusOptions: [
      { id: 1, label: 'Active', value: 'Active' },
      { id: 2, label: 'Inactive', value: 'Inactive' },
      { id: 3, label: 'Suspended', value: 'Suspended' },
    ],
  };
};
