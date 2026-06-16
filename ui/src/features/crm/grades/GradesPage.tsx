// Page component for the grades screen in the crm feature.

import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, ArrowLeft, Folder, Search, Filter, User, BookOpen, BookMarked, Plus, Loader2, X, Users, BarChart3, ChevronLeft, ChevronRight, Award, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import {
  createGrade,
  deleteGrade,
  fetchGrades,
  fetchGradesForce,
  updateGrade,
} from '../../../slices/gradesSlice';
import { fetchTeachers as fetchTeachersThunk } from '../../../slices/teachersSlice';
import { fetchClasses as fetchClassesThunk } from '../../../slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '../../../slices/studentsSlice';
import { fetchSubjects as fetchSubjectsThunk } from '../../../slices/subjectsSlice';
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
} from '../../../slices/pagesUiSlice';
import { useAppDispatch, useAppSelector } from '../hooks';
import { SelectField } from '../students/components/SelectField';
import { termOptions } from '../../../utils/dropdownOptions';
import {
  selectClassOptions,
  selectGradesHasActiveFilters,
  selectGradesPageUi,
  selectStudentOptions,
  selectSubjectOptions,
  selectTeacherOptions,
} from '../../../store/selectors';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewModeToggle, type ViewMode } from '@/components/common/ViewModeToggle';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Grade {
  grade_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  subject: string;
  class_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade_letter: string;
  academic_year: number;
  term: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  class_id?: number;
  teacher_id?: number;
  date_of_birth?: string;
}

interface Subject {
  subject_id?: number;
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id?: number;
}

type FolderType = 'teacher' | 'class' | 'student' | 'subject';

const folderPageSizeOptions = [12, 24, 48];
const gradePageSizeOptions = [10, 25, 50, 100];

const clampPage = (page: number, totalPages: number) => Math.min(Math.max(page, 1), Math.max(totalPages, 1));

const paginateItems = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = clampPage(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    totalPages,
    start,
    end: Math.min(start + pageSize, items.length),
    items: items.slice(start, start + pageSize),
  };
};

const buildPageNumbers = (currentPage: number, totalPages: number) => {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
};

const PaginationBar = ({
  total,
  currentPage,
  totalPages,
  start,
  end,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) => {
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-border dark:bg-card sm:flex-row sm:items-center sm:justify-between">
      <div className="text-muted-foreground">
        Showing {start + 1}-{end} of {total}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-8 w-[92px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} / page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Previous
        </Button>
        <div className="flex items-center gap-1">
          {buildPageNumbers(currentPage, totalPages).map((page, index, pages) => (
            <div key={page} className="flex items-center gap-1">
              {index > 0 && page - pages[index - 1] > 1 && (
                <span className="px-1 text-muted-foreground">...</span>
              )}
              <Button
                type="button"
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Renders the grades page screen.
const GradesPage = () => {
  const dispatch = useAppDispatch();
  const gradeItems = useAppSelector((state) => state.grades.items) as Grade[];
  const gradesLoading = useAppSelector((state) => state.grades.loading);
  const gradesError = useAppSelector((state) => state.grades.error);
  const state = { items: gradeItems, loading: gradesLoading, error: gradesError };

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

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchGrades());
    dispatch(fetchTeachersThunk());
    dispatch(fetchClassesThunk());
    dispatch(fetchStudentsThunk());
    dispatch(fetchSubjectsThunk());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
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

// Runs side effects for this component.
  useEffect(() => {
    setFolderPage(1);
  }, [activeTab, viewMode]);

// Runs side effects for this component.
  useEffect(() => {
    setGradesPage(1);
  }, [searchTerm, filterTerm, filterGrade, selectedFolder?.type, selectedFolder?.id]);

// Handles open modal.
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

// Handles close modal.
  const handleCloseModal = () => {
    dispatch(setGradesModalOpen(false));
    dispatch(setGradesEditingId(null));
    setFormData({
      total_marks: 100,
      academic_year: new Date().getFullYear(),
      term: 'First',
    });
  };

// Handles marks change.
  const handleMarksChange = (marks: number) => {
    const total = formData.total_marks || 100;
// Handles percentage.
    const percentage = (marks / total) * 100;
    let gradeLetter = 'F';
    if (percentage >= 90) gradeLetter = 'A';
    else if (percentage >= 80) gradeLetter = 'B';
    else if (percentage >= 70) gradeLetter = 'C';
    else if (percentage >= 60) gradeLetter = 'D';
    setFormData({ ...formData, marks_obtained: marks, percentage, grade_letter: gradeLetter });
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await dispatch(updateGrade({ id: editingId, data: formData }));
    } else {
      await dispatch(createGrade(formData));
    }
    handleCloseModal();
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      await dispatch(deleteGrade(id));
    }
  };

  // Get student IDs for a teacher
  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => s.teacher_id === teacherId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get student IDs for a class
  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => s.class_id === classId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get grades count for teacher
  const getGradeCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  // Get grades count for class
  const getGradeCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  // Get average percentage for class
  const getAveragePercentageForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    const grades = state.items.filter((g) => studentIds.includes(g.student_id));
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  // Get grades count for student
  const getGradeCountForStudent = (studentId: number): number => {
    return state.items.filter((g) => g.student_id === studentId).length;
  };

  // Get average percentage for student
  const getAveragePercentageForStudent = (studentId: number): number => {
    const grades = state.items.filter((g) => g.student_id === studentId);
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  // Filter grades based on selected folder
  const getFilteredGrades = (): Grade[] => {
    if (!selectedFolder) return state.items;

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
    return state.items.filter((g) => studentIds.includes(g.student_id));
  };

  // Apply search and filters
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
  }, [searchTerm, filterTerm, filterGrade, filterAgeRange, selectedFolder, state.items, students]);

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

// Handles clear filters.
  const clearFilters = () => {
    dispatch(clearGradesFilters());
    setFilterAgeRange('');
  };

// Handles folder click.
  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    dispatch(setGradesSelectedFolder({ type, id, name }));
    clearFilters();
  };

// Handles back to folders.
  const handleBackToFolders = () => {
    dispatch(setGradesSelectedFolder(null));
    clearFilters();
  };

// Returns student name.
  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : 'Unknown Student';
  };

// Returns grade badge classes.
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

// Returns grade color.
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

// Memoizes the grade statistics derived value.
  const gradeStatistics = useMemo(() => {
    const totalGrades = state.items.length;
    const counts = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    let percentageSum = 0;

    state.items.forEach((grade) => {
      const letter = String(grade.grade_letter || 'F').toUpperCase() as keyof typeof counts;
      if (counts[letter] != null) {
        counts[letter] += 1;
      } else {
        counts.F += 1;
      }
      percentageSum += Number(grade.percentage || 0);
    });

    const averagePercentage = totalGrades > 0 ? percentageSum / totalGrades : 0;
    const passingGrades = state.items.filter((grade) => Number(grade.percentage || 0) >= 60).length;
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
  }, [state.items]);
  const folderGridClass =
    viewMode === 'list'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
      : viewMode === 'compact'
        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3'
        : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3';

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {selectedFolder
              ? `Grades - ${selectedFolder.name}`
              : 'Grades Management'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <Button onClick={() => handleOpenModal()} className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-600 hover:to-violet-700 border-0">
            <Plus className="h-4 w-4 mr-2" /> Add Grade
          </Button>
        </div>
      </div>

      {/* Overall Summary Cards - Always Visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Total Grades</p>
            </div>
            <p className="text-2xl font-bold text-white">{gradeStatistics.totalGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-violet-500 via-violet-600 to-purple-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Average</p>
            </div>
            <p className="text-2xl font-bold text-white">{gradeStatistics.averagePercentage.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Passing</p>
            </div>
            <p className="text-2xl font-bold text-white">{gradeStatistics.passingGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Failing</p>
            </div>
            <p className="text-2xl font-bold text-white">{gradeStatistics.failingGrades}</p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-white/70" />
              <p className="text-sm text-white/70">Pass Rate</p>
            </div>
            <p className="text-2xl font-bold text-white">{gradeStatistics.passRate}%</p>
          </CardContent>
        </Card>
      </div>

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1 overflow-x-auto">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => dispatch(setGradesActiveTab('students'))}
                className={`rounded-b-none ${activeTab === 'students' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg shadow-blue-500/30' : ''}`}
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => dispatch(setGradesActiveTab('classes'))}
                className={`rounded-b-none ${activeTab === 'classes' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/30' : ''}`}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => dispatch(setGradesActiveTab('teachers'))}
                className={`rounded-b-none ${activeTab === 'teachers' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-500/30' : ''}`}
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
              <Button
                variant={activeTab === 'subjects' ? 'default' : 'ghost'}
                onClick={() => dispatch(setGradesActiveTab('subjects'))}
                className={`rounded-b-none ${activeTab === 'subjects' ? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white border-0 shadow-lg shadow-cyan-500/30' : ''}`}
              >
                <BookMarked className="h-4 w-4 mr-2" />
                By Subjects
              </Button>
              <Button
                variant={activeTab === 'statistics' ? 'default' : 'ghost'}
                onClick={() => dispatch(setGradesActiveTab('statistics'))}
                className={`rounded-b-none ${activeTab === 'statistics' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/30' : ''}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistics
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* Statistics Tab */}
            {activeTab === 'statistics' && (
              <div className="space-y-6">
                {/* Overview - Top */}
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <p className="text-sm font-medium mb-3">Overview</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-3">
                      <p className="text-xs text-white/70">Students</p>
                      <p className="text-lg font-bold text-white">{students.length}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 p-3">
                      <p className="text-xs text-white/70">Classes</p>
                      <p className="text-lg font-bold text-white">{classes.length}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-3">
                      <p className="text-xs text-white/70">Teachers</p>
                      <p className="text-lg font-bold text-white">{teachers.length}</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-3">
                      <p className="text-xs text-white/70">Subjects</p>
                      <p className="text-lg font-bold text-white">{subjects.length}</p>
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <p className="text-sm font-medium mb-4">Grade Distribution</p>
                  <div className="flex items-end gap-4 h-48">
                    {gradeStatistics.segments.map((segment) => {
                      const maxCount = Math.max(...gradeStatistics.segments.map(s => s.count), 1);
                      const heightPercent = (segment.count / maxCount) * 100;
                      return (
                        <div key={segment.label} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-xs font-bold">{segment.count}</span>
                          <div className="w-full relative rounded-t-lg overflow-hidden" style={{ height: `${Math.max(heightPercent, 4)}%` }}>
                            <div className={`absolute inset-0 ${segment.className} opacity-90`} />
                          </div>
                          <span className="text-xs font-semibold mt-1">Grade {segment.label}</span>
                          <span className="text-xs text-muted-foreground">{segment.percent.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Horizontal Distribution Bar */}
                <div className="rounded-2xl border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium">Grade Mix</p>
                      <p className="text-xs text-muted-foreground">Relative share of grade letters</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{gradeStatistics.passingGrades} passing</p>
                      <p>{gradeStatistics.failingGrades} failing</p>
                    </div>
                  </div>

                  <div className="h-4 w-full overflow-hidden rounded-full bg-muted shadow-inner">
                    <div className="flex h-full w-full">
                      {gradeStatistics.segments.map((segment) => (
                        <div
                          key={segment.label}
                          className={`h-full transition-all duration-300 ${segment.className}`}
                          style={{ width: `${segment.percent}%` }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3 text-sm">
                    {gradeStatistics.segments.map((segment) => (
                      <div key={segment.label} className="rounded-xl border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">Grade {segment.label}</p>
                        <p className="font-semibold">{segment.count}</p>
                        <p className="text-xs text-muted-foreground">{segment.percent.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading students...</p>
                    </div>
                  ) : students.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No students found</p>
                    </div>
                  ) : (
                    paginatedStudents.items.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const gradeCount = getGradeCountForStudent(studentId);
                      const avgPercentage = getAveragePercentageForStudent(studentId);
                      return (
                        <Card
                          key={studentId}
                          className="cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm"
                          onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                        >
                          <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 dark:hidden" />
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                                <Folder className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-semibold">{student.first_name} {student.last_name}</h3>
                              <p className="text-xs text-muted-foreground">ID: {studentId}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                <span>{gradeCount} grades</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: getGradeColor('A') }}>
                                <span>{avgPercentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={students.length}
                  currentPage={paginatedStudents.currentPage}
                  totalPages={paginatedStudents.totalPages}
                  start={paginatedStudents.start}
                  end={paginatedStudents.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(pageSize) => {
                    setFolderPageSize(pageSize);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading classes...</p>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No classes found</p>
                    </div>
                  ) : (
                    paginatedClasses.items.map((cls) => {
                      const classId = cls.class_id || cls.id || 0;
                      const gradeCount = getGradeCountForClass(classId);
                      const avgPercentage = getAveragePercentageForClass(classId);
                      return (
                        <Card
                          key={classId}
                          className="cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm"
                          onClick={() => handleFolderClick('class', classId, cls.class_name)}
                        >
                          <div className="h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 dark:hidden" />
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                                <Folder className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-semibold">{cls.class_name}</h3>
                              <p className="text-xs text-muted-foreground">{cls.class_code} • Level {cls.level}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                <span>{gradeCount} grades</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: getGradeColor('A') }}>
                                <span>{avgPercentage.toFixed(1)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={classes.length}
                  currentPage={paginatedClasses.currentPage}
                  totalPages={paginatedClasses.totalPages}
                  start={paginatedClasses.start}
                  end={paginatedClasses.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(pageSize) => {
                    setFolderPageSize(pageSize);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* By Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading teachers...</p>
                    </div>
                  ) : teachers.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No teachers found</p>
                    </div>
                  ) : (
                    paginatedTeachers.items.map((teacher) => {
                      const teacherId = teacher.teacher_id || teacher.id || 0;
                      const gradeCount = getGradeCountForTeacher(teacherId);
                      return (
                        <Card
                          key={teacherId}
                          className="cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm"
                          onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                        >
                          <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500 dark:hidden" />
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                                <Folder className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-semibold">{teacher.first_name} {teacher.last_name}</h3>
                              <p className="text-xs text-muted-foreground">{teacher.employee_id}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{getStudentIdsForTeacher(teacherId).length} students</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <BookOpen className="h-3 w-3" />
                                <span>{gradeCount} grades</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={teachers.length}
                  currentPage={paginatedTeachers.currentPage}
                  totalPages={paginatedTeachers.totalPages}
                  start={paginatedTeachers.start}
                  end={paginatedTeachers.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(pageSize) => {
                    setFolderPageSize(pageSize);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}

            {/* By Subjects Tab */}
            {activeTab === 'subjects' && (
              <div className="space-y-4">
                <div className={folderGridClass}>
                  {loadingData ? (
                    <div className="col-span-full text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-muted-foreground">Loading subjects...</p>
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No subjects found</p>
                    </div>
                  ) : (
                    paginatedSubjects.items.map((subject) => {
                      const subjectId = subject.subject_id || subject.id || 0;
                      const classStudents = students.filter((s) => s.class_id === subject.class_id);
                      const studentIds = classStudents.map((s) => s.student_id || s.id || 0);
                      const subjectGrades = state.items.filter((g) => studentIds.includes(g.student_id));
                      const avgPercent = subjectGrades.length > 0
                        ? subjectGrades.reduce((acc, g) => acc + (g.percentage || 0), 0) / subjectGrades.length
                        : 0;
                      const cls = classes.find((c) => (c.class_id || c.id) === subject.class_id);
                      return (
                        <Card
                          key={subjectId}
                          className="cursor-pointer overflow-hidden border-slate-200/80 bg-white transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-border dark:bg-card dark:hover:shadow-sm"
                          onClick={() => handleFolderClick('subject', subject.class_id, subject.subject_name)}
                        >
                          <div className="h-1 bg-gradient-to-r from-cyan-500 to-teal-500 dark:hidden" />
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-900/30">
                                <BookMarked className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <h3 className="text-sm font-semibold">{subject.subject_name}</h3>
                              <p className="text-xs text-muted-foreground">{cls?.class_name || `Class ${subject.class_id}`} • {subject.subject_code}</p>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                <span>{classStudents.length} students</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: getGradeColor('A') }}>
                                <span>{avgPercent.toFixed(1)}%</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
                <PaginationBar
                  total={subjects.length}
                  currentPage={paginatedSubjects.currentPage}
                  totalPages={paginatedSubjects.totalPages}
                  start={paginatedSubjects.start}
                  end={paginatedSubjects.end}
                  pageSize={folderPageSize}
                  pageSizeOptions={folderPageSizeOptions}
                  onPageChange={setFolderPage}
                  onPageSizeChange={(pageSize) => {
                    setFolderPageSize(pageSize);
                    setFolderPage(1);
                  }}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        // GRADES LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by student or subject..."
                value={searchTerm}
                onChange={(e) => dispatch(setGradesSearchTerm(e.target.value))}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => dispatch(setGradesSearchTerm(''))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => dispatch(setGradesShowFilters(!showFilters))}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {(filterTerm ? 1 : 0) + (filterGrade ? 1 : 0)}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" /> Clear All
              </Button>
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>{displayedGrades.length} grades</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={filterTerm} onValueChange={(value) => dispatch(setGradesFilterTerm(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Terms</SelectItem>
                    {termOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Grade Letter</Label>
                <Select value={filterGrade} onValueChange={(value) => dispatch(setGradesFilterGrade(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Grades</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Select value={filterAgeRange} onValueChange={setFilterAgeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Ages</SelectItem>
                    <SelectItem value="3-6">3-6 years</SelectItem>
                    <SelectItem value="7-10">7-10 years</SelectItem>
                    <SelectItem value="11-14">11-14 years</SelectItem>
                    <SelectItem value="15-18">15-18 years</SelectItem>
                    <SelectItem value="19-25">19-25 years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Grades Table */}
          <div className="border rounded-lg overflow-hidden [&_table]:text-xs [&_th]:text-xs [&_td]:py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">Loading...</TableCell>
                  </TableRow>
                ) : displayedGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      {hasActiveFilters ? 'No grades match your criteria' : 'No grades found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGrades.items.map((grade) => (
                    <TableRow key={grade.grade_id || grade.id}>
                      <TableCell>{getStudentName(grade.student_id)}</TableCell>
                      <TableCell>{grade.subject}</TableCell>
                      <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                      <TableCell>{(Number(grade.percentage) || 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-bold border min-w-[2.5rem] justify-center ${getGradeBadgeClasses(grade.grade_letter)}`}>
                          {grade.grade_letter}
                        </Badge>
                      </TableCell>
                      <TableCell>{grade.term}</TableCell>
                      <TableCell>{grade.academic_year}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(grade)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(grade.grade_id || grade.id || 0)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4">
            <PaginationBar
              total={displayedGrades.length}
              currentPage={paginatedGrades.currentPage}
              totalPages={paginatedGrades.totalPages}
              start={paginatedGrades.start}
              end={paginatedGrades.end}
              pageSize={gradesPageSize}
              pageSizeOptions={gradePageSizeOptions}
              onPageChange={setGradesPage}
              onPageSizeChange={(pageSize) => {
                setGradesPageSize(pageSize);
                setGradesPage(1);
              }}
            />
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            dispatch(setGradesModalOpen(true));
            return;
          }
          handleCloseModal();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, student_id: Number(value) })
                }
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Teacher"
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, teacher_id: Number(value) })
                }
                options={teacherOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a teacher"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Subject"
                name="subject"
                value={formData.subject || ''}
                onChange={(value) =>
                  setFormData({ ...formData, subject: value })
                }
                options={subjectOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a subject"
              />
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(value) =>
                  setFormData({ ...formData, class_id: Number(value) })
                }
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marks_obtained">Marks Obtained *</Label>
                  <Input
                    type="number"
                    id="marks_obtained"
                    required
                    step="0.1"
                    value={formData.marks_obtained || ''}
                    onChange={(e) => handleMarksChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    type="number"
                    id="total_marks"
                    value={formData.total_marks || 100}
                    onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage</Label>
                  <Input
                    type="number"
                    id="percentage"
                    step="0.1"
                    value={formData.percentage || 0}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_letter">Grade Letter</Label>
                  <Input
                    type="text"
                    id="grade_letter"
                    value={formData.grade_letter || 'F'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year *</Label>
                  <Input
                    type="number"
                    id="academic_year"
                    required
                    value={formData.academic_year || new Date().getFullYear()}
                    onChange={(e) => setFormData({ ...formData, academic_year: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term">Term *</Label>
                  <Select required value={formData.term || 'First'} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {termOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading} onClick={handleSubmit}>
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default GradesPage;
