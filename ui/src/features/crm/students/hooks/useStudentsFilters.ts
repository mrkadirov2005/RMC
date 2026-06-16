import { useEffect, useMemo, useState } from 'react';
import type { Class, Student } from '../types';
import { getStudentCount, getStatusVariant } from '../queries';

const normalizeLimit = (value: number) => {
  if (!Number.isFinite(value)) return 20;
  return Math.min(100, Math.max(1, Math.floor(value)));
};

// Provides students filters.
export const useStudentsFilters = (students: Student[]) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterAddress, setFilterAddress] = useState('');
  const [filterAge, setFilterAge] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [filterAddress, filterAge, filterClassId, filterGender, filterLevel, filterSchool, filterStatus, filterSubjectId, limit, searchTerm]);

  const studentParams = useMemo(() => ({
    q: searchTerm.trim() || undefined,
    school_name: filterSchool || undefined,
    class_id: filterClassId || undefined,
    subject_id: filterSubjectId || undefined,
    level: filterLevel || undefined,
    address: filterAddress || undefined,
    age: filterAge || undefined,
    gender: filterGender || undefined,
    status: filterStatus || undefined,
    page,
    limit: normalizeLimit(limit),
  }), [filterAddress, filterAge, filterClassId, filterGender, filterLevel, filterSchool, filterStatus, filterSubjectId, limit, page, searchTerm]);

// Handles clear filters.
  const clearFilters = () => {
    setSearchTerm('');
    setFilterGender('');
    setFilterStatus('');
    setFilterSchool('');
    setFilterClassId('');
    setFilterSubjectId('');
    setFilterLevel('');
    setFilterAddress('');
    setFilterAge('');
    setPage(1);
  };
  const hasActiveFilters = Boolean(searchTerm || filterGender || filterStatus || filterSchool || filterClassId || filterSubjectId || filterLevel || filterAddress || filterAge);
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
    setLimit: (value: number) => setLimit(normalizeLimit(value)),
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
