import { useMemo, useState } from 'react';
import { useUrlState } from '@/shared/hooks/useUrlState';
import type { Class, Student } from '../types';
import { getStudentCount, getStatusVariant } from '../queries';

const normalizeLimit = (value: number) => {
  if (!Number.isFinite(value)) return 20;
  return Math.min(100, Math.max(1, Math.floor(value)));
};

const URL_DEFAULTS = {
  q: '', gender: '', status: '', school: '', class_id: '', teacher_id: '', subject_id: '', level: '', address: '', age: '', page: '1', limit: '20',
};

// Provides students filters.
export const useStudentsFilters = (students: Student[]) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  // Search, filters, page and page size live in the address, so a reload or Back from a student's
  // profile brings the same list back.
  const [url, update] = useUrlState(URL_DEFAULTS);
  const searchTerm = url.q;
  const filterGender = url.gender;
  const filterStatus = url.status;
  const filterSchool = url.school;
  const filterClassId = url.class_id;
  const filterTeacherId = url.teacher_id;
  const filterSubjectId = url.subject_id;
  const filterLevel = url.level;
  const filterAddress = url.address;
  const filterAge = url.age;
  const page = Math.max(1, Number(url.page) || 1);
  const limit = normalizeLimit(Number(url.limit));
  const [showFilters, setShowFilters] = useState(() => Boolean(url.gender || url.status || url.school || url.class_id || url.teacher_id || url.subject_id || url.level || url.address || url.age));

  // A changed search or filter starts again from page 1 (one update, so the page is not lost).
  const setFilter = (key: keyof typeof URL_DEFAULTS) => (value: string) => update({ [key]: value, page: '1' });
  const setSearchTerm = setFilter('q');
  const setFilterGender = setFilter('gender');
  const setFilterStatus = setFilter('status');
  const setFilterSchool = setFilter('school');
  const setFilterClassId = setFilter('class_id');
  const setFilterTeacherId = setFilter('teacher_id');
  const setFilterSubjectId = setFilter('subject_id');
  const setFilterLevel = setFilter('level');
  const setFilterAddress = setFilter('address');
  const setFilterAge = setFilter('age');
  const setPage = (value: number) => update({ page: String(Math.max(1, value)) });
  const setLimit = (value: number) => update({ limit: String(normalizeLimit(value)), page: '1' });

  const studentParams = useMemo(() => ({
    q: searchTerm.trim() || undefined,
    school_name: filterSchool || undefined,
    class_id: filterClassId || undefined,
    teacher_id: filterTeacherId || undefined,
    subject_id: filterSubjectId || undefined,
    level: filterLevel || undefined,
    address: filterAddress || undefined,
    age: filterAge || undefined,
    gender: filterGender || undefined,
    status: filterStatus || undefined,
    page,
    limit: normalizeLimit(limit),
  }), [filterAddress, filterAge, filterClassId, filterGender, filterLevel, filterSchool, filterStatus, filterSubjectId, filterTeacherId, limit, page, searchTerm]);

// Handles clear filters.
  const clearFilters = () => update({ q: '', gender: '', status: '', school: '', class_id: '', teacher_id: '', subject_id: '', level: '', address: '', age: '', page: '1' });
  const hasActiveFilters = Boolean(searchTerm || filterGender || filterStatus || filterSchool || filterClassId || filterTeacherId || filterSubjectId || filterLevel || filterAddress || filterAge);
  return {
    selectedClass,
    setSelectedClass,
    handleClassClick: (cls: Class) => setSelectedClass(cls),
    handleBackToClasses: () => setSelectedClass(null),
    searchTerm,
    setSearchTerm,
    filterGender,
    setFilterGender,
    filterStatus,
    setFilterStatus,
    filterSchool,
    setFilterSchool,
    filterClassId,
    setFilterClassId,
    filterTeacherId,
    setFilterTeacherId,
    filterSubjectId,
    setFilterSubjectId,
    filterLevel,
    setFilterLevel,
    filterAddress,
    setFilterAddress,
    filterAge,
    setFilterAge,
    page,
    setPage,
    limit,
    setLimit,
    studentParams,
    showFilters,
    setShowFilters,
    displayedStudents: students,
    clearFilters,
    hasActiveFilters,
    getStudentCount: (classId: number) => getStudentCount(students, classId),
    getStatusVariant,
  };
};
