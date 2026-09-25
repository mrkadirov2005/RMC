// React hooks for the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { studentAPI } from '@/shared/api/api';
import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';
import type { Student } from '../types';

const toPositiveId = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const getStudentTeacherId = (student: Student, classTeacherMap: Map<number, number>) => {
  const effectiveTeacherId = toPositiveId(student.effective_teacher_id);
  if (effectiveTeacherId) return effectiveTeacherId;

  const classTeacherId = toPositiveId(student.class_teacher_id);
  if (classTeacherId) return classTeacherId;

  const classId = toPositiveId(student.class_id);
  if (classId) {
    const teacherId = classTeacherMap.get(classId);
    if (teacherId) return teacherId;
  }

  return toPositiveId(student.teacher_id);
};

// Provides students page.
export const useStudentsPage = () => {
  const filters = useStudentsFilters([]);
  const data = useStudentsData(filters.studentParams);
  const modal = useStudentsModal(filters.selectedClass, data.actions.fetchAll);
  const [teacherFallbackStudents, setTeacherFallbackStudents] = useState<Student[] | null>(null);
  const [teacherFallbackLoading, setTeacherFallbackLoading] = useState(false);
  const classTeacherMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const classItem of data.classes) {
      const classId = toPositiveId(classItem.class_id || classItem.id);
      const teacherId = toPositiveId(classItem.teacher_id);
      if (classId && teacherId) map.set(classId, teacherId);
    }
    return map;
  }, [data.classes]);

  useEffect(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    if (!teacherId) {
      setTeacherFallbackStudents(null);
      setTeacherFallbackLoading(false);
      return;
    }

    let cancelled = false;
    setTeacherFallbackLoading(true);
    studentAPI.getAll()
      .then((response) => {
        if (cancelled) return;
        const payload = (response as any).data ?? response;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        setTeacherFallbackStudents(rows as Student[]);
      })
      .catch(() => {
        if (!cancelled) setTeacherFallbackStudents(null);
      })
      .finally(() => {
        if (!cancelled) setTeacherFallbackLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.filterTeacherId]);

  const teacherFilteredStudents = useMemo(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    const source = teacherFallbackStudents ?? data.state.items;
    if (!teacherId) return source;
    return source.filter((student) => getStudentTeacherId(student, classTeacherMap) === teacherId);
  }, [classTeacherMap, data.state.items, filters.filterTeacherId, teacherFallbackStudents]);

  const displayedStudents = useMemo(() => {
    const teacherId = toPositiveId(filters.filterTeacherId);
    if (!teacherId || !teacherFallbackStudents) return teacherFilteredStudents;
    const start = (filters.page - 1) * filters.limit;
    return teacherFilteredStudents.slice(start, start + filters.limit);
  }, [filters.limit, filters.page, filters.filterTeacherId, teacherFallbackStudents, teacherFilteredStudents]);

  const state = useMemo(() => {
    if (!toPositiveId(filters.filterTeacherId) || !teacherFallbackStudents) {
      return { ...data.state, loading: data.state.loading || teacherFallbackLoading };
    }
    return {
      ...data.state,
      items: displayedStudents,
      loading: data.state.loading || teacherFallbackLoading,
      meta: {
        ...data.state.meta,
        total: teacherFilteredStudents.length,
        page: filters.page,
        limit: filters.limit,
      },
    };
  }, [
    data.state,
    displayedStudents,
    filters.filterTeacherId,
    filters.limit,
    filters.page,
    teacherFallbackLoading,
    teacherFallbackStudents,
    teacherFilteredStudents.length,
  ]);

  return {
    ...data,
    ...filters,
    ...modal,
    state,
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
