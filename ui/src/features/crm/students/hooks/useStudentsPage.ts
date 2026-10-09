// React hooks for the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { studentAPI } from '@/shared/api/api';
import type { StudentListParams } from '@/slices/studentsSlice';
import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';
import type { Student } from '../types';

const toPositiveId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getStudentTeacherIds = (student: Student) => [
  student.effective_teacher_id,
  student.class_teacher_id,
  student.teacher_id,
].map(toPositiveId).filter((id): id is number => id !== null);

// Provides students page.
export const useStudentsPage = () => {
  const filters = useStudentsFilters([]);
  const data = useStudentsData(filters.studentParams);
  const modal = useStudentsModal(filters.selectedClass, data.actions.fetchAll);
  const [teacherFallbackStudents, setTeacherFallbackStudents] = useState<Student[] | null>(null);
  const [teacherFallbackLoading, setTeacherFallbackLoading] = useState(false);
  const selectedTeacherId = toPositiveId(filters.filterTeacherId);
  const filteredClassOptions = useMemo(() => {
    if (!selectedTeacherId) return data.classOptions;

    const teacherClassIds = new Set(
      data.classes
        .filter((item) => toPositiveId(item.teacher_id) === selectedTeacherId)
        .map((item) => toPositiveId(item.class_id || item.id))
        .filter((id): id is number => id !== null)
    );
    return data.classOptions.filter((option) => teacherClassIds.has(Number(option.value)));
  }, [data.classes, data.classOptions, selectedTeacherId]);

  useEffect(() => {
    if (filters.filterClassId && !filteredClassOptions.some((option) => String(option.value) === filters.filterClassId)) {
      filters.setFilterClassId('');
    }
  }, [filteredClassOptions, filters.filterClassId, filters.setFilterClassId]);

  useEffect(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    if (!teacherId) {
      setTeacherFallbackStudents(null);
      setTeacherFallbackLoading(false);
      return;
    }

    let cancelled = false;
    const loadFilteredRoster = async () => {
      setTeacherFallbackLoading(true);
      try {
        const params: StudentListParams = {
          ...filters.studentParams,
          teacher_id: undefined,
          page: 1,
          limit: 100,
        };
        const rows: Student[] = [];
        let page = 1;
        let total = Number.POSITIVE_INFINITY;
        while (rows.length < total) {
          const response = await studentAPI.getAll({ ...params, page });
          const payload = (response as any).data ?? response;
          const pageRows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
          rows.push(...(pageRows as Student[]));
          total = Array.isArray(payload) ? rows.length : Number(payload?.total) || rows.length;
          if (pageRows.length === 0 || pageRows.length < 100) break;
          page += 1;
        }
        if (!cancelled) {
          setTeacherFallbackStudents(
            rows.filter((student) => getStudentTeacherIds(student).includes(teacherId))
          );
        }
      } catch {
        if (!cancelled) setTeacherFallbackStudents(null);
      } finally {
        if (!cancelled) setTeacherFallbackLoading(false);
      }
    };

    void loadFilteredRoster();
    return () => {
      cancelled = true;
    };
  }, [filters.filterTeacherId, filters.studentParams]);

  const displayedStudents = useMemo(() => {
    if (!toPositiveId(filters.filterTeacherId) || !teacherFallbackStudents) return data.state.items;
    const start = (filters.page - 1) * filters.limit;
    return teacherFallbackStudents.slice(start, start + filters.limit);
  }, [data.state.items, filters.filterTeacherId, filters.limit, filters.page, teacherFallbackStudents]);

  const state = useMemo(() => {
    if (!toPositiveId(filters.filterTeacherId) || !teacherFallbackStudents) {
      return { ...data.state, loading: data.state.loading || teacherFallbackLoading };
    }
    return {
      ...data.state,
      items: displayedStudents,
      loading: data.state.loading || teacherFallbackLoading,
      meta: { ...data.state.meta, total: teacherFallbackStudents.length, page: filters.page, limit: filters.limit },
    };
  }, [data.state, displayedStudents, filters.filterTeacherId, filters.limit, filters.page, teacherFallbackLoading, teacherFallbackStudents]);

  return {
    ...data,
    ...filters,
    ...modal,
    state,
    displayedStudents,
    filteredClassOptions,
    genderOptions: [
      { id: 1, label: 'Male', value: 'Male' },
      { id: 2, label: 'Female', value: 'Female' },
      { id: 3, label: 'Other', value: 'Other' },
    ],
    statusOptions: [
      { id: 1, label: 'Active', value: 'Active' },
      { id: 2, label: 'Inactive', value: 'Inactive' },
      { id: 3, label: 'Graduated', value: 'Graduated' },
      { id: 4, label: 'Removed', value: 'Removed' },
      { id: 5, label: 'Transferred', value: 'Transferred' },
    ],
  };
};
