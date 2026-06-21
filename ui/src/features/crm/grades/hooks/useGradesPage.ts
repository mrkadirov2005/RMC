// Custom hook for the grades page – owns all state, effects, handlers, and derived data.

import { useState, useEffect, useMemo } from 'react';
import {
  createGrade,
  deleteGrade,
  fetchGrades,
  fetchGradesForce,
  updateGrade,
} from '../../../../slices/gradesSlice';
import { fetchTeachers as fetchTeachersThunk } from '../../../../slices/teachersSlice';
import { fetchClasses as fetchClassesThunk } from '../../../../slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '../../../../slices/studentsSlice';
import { fetchSubjects as fetchSubjectsThunk } from '../../../../slices/subjectsSlice';
import {
  clearGradesFilters,
  setGradesActiveTab,
  setGradesEditingId,
  setGradesFilterGrade,
  setGradesFilterTerm,
  setGradesModalOpen,
  setGradesSearchTerm,
  setGradesSelectedFolder,
  setGradesShowFilters,
} from '../../../../slices/pagesUiSlice';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  selectClassOptions,
  selectGradesHasActiveFilters,
  selectGradesPageUi,
  selectStudentOptions,
  selectSubjectOptions,
  selectTeacherOptions,
} from '../../../../store/selectors';
import { paginateItems } from '@/components/common/pagination';
import type { ViewMode } from '@/components/common/ViewModeToggle';
import type { Grade, Teacher, Class, Student, Subject, FolderType } from '../types';

const folderPageSizeOptions = [12, 24, 48];
const gradePageSizeOptions = [10, 25, 50, 100];

export const useGradesPage = () => {
  const dispatch = useAppDispatch();

  // ---- Redux selectors ----
  const gradeItems = useAppSelector((state) => state.grades.items) as Grade[];
  const gradesLoading = useAppSelector((state) => state.grades.loading);
  const gradesError = useAppSelector((state) => state.grades.error);
  const stateObj = { items: gradeItems, loading: gradesLoading, error: gradesError };

  const teachers = useAppSelector((state) => state.teachers.items) as Teacher[];
  const classes = useAppSelector((state) => state.classes.items) as Class[];
  const students = useAppSelector((state) => state.students.items) as Student[];
  const subjects = useAppSelector((state) => state.subjects.items) as Subject[];
  const loadingData = useAppSelector(
    (state) => state.teachers.loading || state.classes.loading || state.students.loading
  );
  const studentOptions = useAppSelector(selectStudentOptions);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const subjectOptions = useAppSelector(selectSubjectOptions);
  const classOptions = useAppSelector(selectClassOptions);
  const isLoadingOptions = useAppSelector(
    (state) =>
      state.students.loading || state.teachers.loading || state.subjects.loading || state.classes.loading
  );
  const gradesUi = useAppSelector(selectGradesPageUi);
  const {
    activeTab,
    selectedFolder,
    isModalOpen,
    editingId,
    searchTerm,
    filterTerm,
    filterGrade,
    showFilters,
  } = gradesUi;
  const hasActiveFilters = useAppSelector(selectGradesHasActiveFilters);

  // ---- Local state ----
  const [formData, setFormData] = useState<Partial<Grade>>({
    total_marks: 100,
    academic_year: new Date().getFullYear(),
    term: 'First',
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [folderPage, setFolderPage] = useState(1);
  const [folderPageSize, setFolderPageSize] = useState(12);
  const [gradesPage, setGradesPage] = useState(1);
  const [gradesPageSize, setGradesPageSize] = useState(25);
  const [filterAgeRange, setFilterAgeRange] = useState('');

  // ---- Helper functions ----
  const getStudentAge = (student: Student): number | null => {
    if (!student.date_of_birth) return null;
    const dob = new Date(student.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const matchesAgeRange = (studentId: number, range: string): boolean => {
    if (!range) return true;
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    if (!student) return false;
    const age = getStudentAge(student);
    if (age === null) return false;
    const [min, max] = range.split('-').map(Number);
    return age >= min && age <= max;
  };

  // ---- Side effects ----
  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchTeachersThunk());
    dispatch(fetchClassesThunk());
    dispatch(fetchStudentsThunk());
    dispatch(fetchSubjectsThunk());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleActiveCenterChanged = () => {
      dispatch(fetchGradesForce());
      dispatch(fetchTeachersThunk());
      dispatch(fetchClassesThunk());
      dispatch(fetchStudentsThunk());
      dispatch(fetchSubjectsThunk());
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch]);

  useEffect(() => {
    setFolderPage(1);
  }, [activeTab, viewMode]);

  useEffect(() => {
    setGradesPage(1);
  }, [searchTerm, filterTerm, filterGrade, selectedFolder?.type, selectedFolder?.id]);

  // ---- Handlers ----
  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      dispatch(setGradesEditingId(grade.grade_id || grade.id || null));
      setFormData(grade);
    } else {
      dispatch(setGradesEditingId(null));
      setFormData({
        total_marks: 100,
        academic_year: new Date().getFullYear(),
        term: 'First',
      });
    }
    dispatch(setGradesModalOpen(true));
  };

  const handleCloseModal = () => {
    dispatch(setGradesModalOpen(false));
    dispatch(setGradesEditingId(null));
    setFormData({
      total_marks: 100,
      academic_year: new Date().getFullYear(),
      term: 'First',
    });
  };

  const handleMarksChange = (marks: number) => {
    const total = formData.total_marks || 100;
    const percentage = (marks / total) * 100;
    let gradeLetter = 'F';
    if (percentage >= 90) gradeLetter = 'A';
    else if (percentage >= 80) gradeLetter = 'B';
    else if (percentage >= 70) gradeLetter = 'C';
    else if (percentage >= 60) gradeLetter = 'D';
    setFormData({ ...formData, marks_obtained: marks, percentage, grade_letter: gradeLetter });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await dispatch(updateGrade({ id: editingId, data: formData }));
    } else {
      await dispatch(createGrade(formData));
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      await dispatch(deleteGrade(id));
    }
  };

  // ---- Computed value functions ----
  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => s.teacher_id === teacherId)
      .map((s) => s.student_id || s.id || 0);
  };

  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => s.class_id === classId)
      .map((s) => s.student_id || s.id || 0);
  };

  const getGradeCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return stateObj.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  const getGradeCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return stateObj.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  const getAveragePercentageForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    const grades = stateObj.items.filter((g) => studentIds.includes(g.student_id));
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  const getGradeCountForStudent = (studentId: number): number => {
    return stateObj.items.filter((g) => g.student_id === studentId).length;
  };

  const getAveragePercentageForStudent = (studentId: number): number => {
    const grades = stateObj.items.filter((g) => g.student_id === studentId);
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  const getFilteredGrades = (): Grade[] => {
    if (!selectedFolder) return stateObj.items;

    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') {
      studentIds = getStudentIdsForTeacher(selectedFolder.id);
    } else if (selectedFolder.type === 'class') {
      studentIds = getStudentIdsForClass(selectedFolder.id);
    } else if (selectedFolder.type === 'student') {
      studentIds = [selectedFolder.id];
    } else if (selectedFolder.type === 'subject') {
      studentIds = students
        .filter((s) => s.class_id === selectedFolder.id)
        .map((s) => s.student_id || s.id || 0);
    }
    return stateObj.items.filter((g) => studentIds.includes(g.student_id));
  };

  // ---- Memoised derived data ----
  const displayedGrades = useMemo(() => {
    let grades = getFilteredGrades();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      grades = grades.filter((g) => {
        const student = students.find((s) => (s.student_id || s.id) === g.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return (
          studentName.includes(search) ||
          (g.subject && g.subject.toLowerCase().includes(search))
        );
      });
    }

    if (filterTerm) {
      grades = grades.filter((g) => g.term === filterTerm);
    }

    if (filterGrade) {
      grades = grades.filter((g) => g.grade_letter === filterGrade);
    }

    if (filterAgeRange) {
      grades = grades.filter((g) => matchesAgeRange(g.student_id, filterAgeRange));
    }

    return grades;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterTerm, filterGrade, filterAgeRange, selectedFolder, stateObj.items, students]);

  const paginatedStudents = useMemo(
    () => paginateItems(students, folderPage, folderPageSize),
    [students, folderPage, folderPageSize]
  );
  const paginatedClasses = useMemo(
    () => paginateItems(classes, folderPage, folderPageSize),
    [classes, folderPage, folderPageSize]
  );
  const paginatedTeachers = useMemo(
    () => paginateItems(teachers, folderPage, folderPageSize),
    [teachers, folderPage, folderPageSize]
  );
  const paginatedSubjects = useMemo(
    () => paginateItems(subjects, folderPage, folderPageSize),
    [subjects, folderPage, folderPageSize]
  );
  const paginatedGrades = useMemo(
    () => paginateItems(displayedGrades, gradesPage, gradesPageSize),
    [displayedGrades, gradesPage, gradesPageSize]
  );

  const gradeStatistics = useMemo(() => {
    const totalGrades = stateObj.items.length;
    const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let percentageSum = 0;

    stateObj.items.forEach((grade) => {
      const letter = String(grade.grade_letter || 'F').toUpperCase() as keyof typeof counts;
      if (counts[letter] != null) {
        counts[letter] += 1;
      } else {
        counts.F += 1;
      }
      percentageSum += Number(grade.percentage || 0);
    });

    const averagePercentage = totalGrades > 0 ? percentageSum / totalGrades : 0;
    const passingGrades = stateObj.items.filter((grade) => Number(grade.percentage || 0) >= 60).length;
    const passRate = totalGrades > 0 ? Math.round((passingGrades / totalGrades) * 100) : 0;

    return {
      totalGrades,
      averagePercentage,
      passingGrades,
      failingGrades: totalGrades - passingGrades,
      passRate,
      segments: [
        { label: 'A', count: counts.A, percent: totalGrades > 0 ? (counts.A / totalGrades) * 100 : 0, className: 'bg-emerald-500' },
        { label: 'B', count: counts.B, percent: totalGrades > 0 ? (counts.B / totalGrades) * 100 : 0, className: 'bg-blue-500' },
        { label: 'C', count: counts.C, percent: totalGrades > 0 ? (counts.C / totalGrades) * 100 : 0, className: 'bg-amber-500' },
        { label: 'D', count: counts.D, percent: totalGrades > 0 ? (counts.D / totalGrades) * 100 : 0, className: 'bg-orange-500' },
        { label: 'F', count: counts.F, percent: totalGrades > 0 ? (counts.F / totalGrades) * 100 : 0, className: 'bg-rose-500' },
      ],
    };
  }, [stateObj.items]);

  const folderGridClass = 'overflow-hidden rounded-md border border-slate-200/80 bg-white dark:border-border dark:bg-card';

  // ---- Action helpers ----
  const clearFilters = () => {
    dispatch(clearGradesFilters());
    setFilterAgeRange('');
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    dispatch(setGradesSelectedFolder({ type, id, name }));
    clearFilters();
  };

  const handleBackToFolders = () => {
    dispatch(setGradesSelectedFolder(null));
    clearFilters();
  };

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

  const getGradeBadgeClasses = (grade: string): string => {
    switch (grade) {
      case 'A':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'C':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'D':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'F':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getGradeColor = (grade: string): string => {
    switch (grade) {
      case 'A': return '#10b981';
      case 'B': return '#3b82f6';
      case 'C': return '#f59e0b';
      case 'D': return '#f97316';
      case 'F': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return {
    // Redux-dispatched UI actions
    dispatch,
    setGradesActiveTab,
    setGradesSearchTerm,
    setGradesFilterTerm,
    setGradesFilterGrade,
    setGradesShowFilters,

    // State
    state: stateObj,
    teachers,
    classes,
    students,
    subjects,
    loadingData,
    studentOptions,
    teacherOptions,
    subjectOptions,
    classOptions,
    isLoadingOptions,
    activeTab,
    selectedFolder,
    isModalOpen,
    editingId,
    searchTerm,
    filterTerm,
    filterGrade,
    filterAgeRange,
    setFilterAgeRange,
    showFilters,
    hasActiveFilters,
    formData,
    setFormData,
    viewMode,
    setViewMode,
    folderPage,
    setFolderPage,
    folderPageSize,
    setFolderPageSize,
    gradesPage,
    setGradesPage,
    gradesPageSize,
    setGradesPageSize,

    // Derived / memoised
    displayedGrades,
    paginatedStudents,
    paginatedClasses,
    paginatedTeachers,
    paginatedSubjects,
    paginatedGrades,
    gradeStatistics,
    folderGridClass,

    // Handlers
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleMarksChange,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,

    // Utility functions
    getStudentIdsForTeacher,
    getStudentIdsForClass,
    getGradeCountForTeacher,
    getGradeCountForClass,
    getAveragePercentageForClass,
    getGradeCountForStudent,
    getAveragePercentageForStudent,
    getStudentName,
    getGradeBadgeClasses,
    getGradeColor,

    // Constants
    folderPageSizeOptions,
    gradePageSizeOptions,
  };
};
