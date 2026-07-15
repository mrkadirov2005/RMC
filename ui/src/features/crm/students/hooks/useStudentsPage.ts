// React hooks for the crm feature.

import { useMemo } from 'react';
import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';
import type { Student } from '../types';

const toPositiveId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getStudentTeacherId = (student: Student) =>
  toPositiveId(student.effective_teacher_id) || toPositiveId(student.teacher_id) || toPositiveId(student.class_teacher_id);

// Provides students page.
export const useStudentsPage = () => {
  const filters = useStudentsFilters([]);
  const data = useStudentsData(filters.studentParams);
  const modal = useStudentsModal(filters.selectedClass, data.actions.fetchAll);
  const displayedStudents = useMemo(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    if (!teacherId) return data.state.items;
    return data.state.items.filter((student) => getStudentTeacherId(student) === teacherId);
  }, [data.state.items, filters.filterTeacherId]);

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
