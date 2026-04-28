// React hooks for the crm feature.

import { useMemo, useState } from 'react';
import type { Class, Student } from '../types';
import { getFilteredStudents, getStudentCount, getStatusVariant } from '../queries';

// Provides students filters.
export const useStudentsFilters = (students: Student[]) => {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
// Memoizes the displayed students derived value.
  const displayedStudents = useMemo(() => getFilteredStudents(students, selectedClass, searchTerm, filterGender, filterStatus), [students, selectedClass, searchTerm, filterGender, filterStatus]);
// Handles clear filters.
  const clearFilters = () => { setSearchTerm(''); setFilterGender(''); setFilterStatus(''); };
  const hasActiveFilters = Boolean(searchTerm || filterGender || filterStatus);
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
    showFilters,
    setShowFilters,
    displayedStudents,
    clearFilters,
    hasActiveFilters,
    getStudentCount: (classId: number) => getStudentCount(students, classId),
    getStatusVariant,
  };
};
