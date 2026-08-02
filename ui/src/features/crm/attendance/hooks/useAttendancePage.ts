// React hooks for the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { attendanceStatusOptions } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  createAttendance,
  deleteAttendance,
  fetchAttendance,
  fetchAttendanceForce,
  updateAttendance,
} from '../../../../slices/attendanceSlice';
import { fetchTeachers as fetchTeachersThunk } from '../../../../slices/teachersSlice';
import { fetchClasses as fetchClassesThunk } from '../../../../slices/classesSlice';
import { fetchStudents as fetchStudentsThunk } from '../../../../slices/studentsSlice';
import { fetchSubjects as fetchSubjectsThunk } from '../../../../slices/subjectsSlice';
import type { Subject as SubjectSlice } from '../../../../slices/subjectsSlice';
import {
  selectClassOptions,
  selectStudentOptions,
  selectTeacherOptions,
} from '../../../../store/selectors';
import type {
  Attendance,
  AttendanceFolderSelection,
  AttendanceTabType,
  Class,
  Student,
  Subject,
  Teacher,
} from '../types';
import {
  getAttendanceCountForClass,
  getAttendanceCountForStudent,
  getAttendanceCountForTeacher,
  getFilteredAttendance,
  getPresentCountForClass,
  getPresentCountForStudent,
  getStatusBadgeClasses,
  getStudentIdsForClass,
  getStudentIdsForTeacher,
  getStudentName,
} from '../queries';

// Provides attendance page.
export const useAttendancePage = () => {
  const dispatch = useAppDispatch();

  // Pull from Redux store — avoids redundant API calls if siblings already fetched
  const attendanceItems = useAppSelector((state) => state.attendance.items) as Attendance[];
  const attendanceLoading = useAppSelector((state) => state.attendance.loading);
  const attendanceError = useAppSelector((state) => state.attendance.error);
  const teacherItems = useAppSelector((state) => state.teachers.items) as Teacher[];
  const classItems = useAppSelector((state) => state.classes.items) as Class[];
  const studentItems = useAppSelector((state) => state.students.items) as Student[];

  const subjectItems = useAppSelector((state) => state.subjects.items) as SubjectSlice[];
  const subjects = subjectItems as unknown as Subject[];

  const state = { items: attendanceItems, loading: attendanceLoading, error: attendanceError };
  const teachers = teacherItems;
  const classes = classItems;
  const students = studentItems;
  const studentOptions = useAppSelector(selectStudentOptions);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const classOptions = useAppSelector(selectClassOptions);

  const [activeTab, setActiveTab] = useState<AttendanceTabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<AttendanceFolderSelection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({ status: 'Present' });
  const isLoadingOptions = useAppSelector(
    (state) => state.students.loading || state.teachers.loading || state.classes.loading
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterAgeRange, setFilterAgeRange] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // loadingData reflects whether supporting entities are being loaded
  const loadingData = useAppSelector(
    (state) => state.teachers.loading || state.classes.loading || state.students.loading
  );

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchAttendance());
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
      dispatch(fetchAttendanceForce());
      dispatch(fetchTeachersThunk());
      dispatch(fetchClassesThunk());
      dispatch(fetchStudentsThunk());
      dispatch(fetchSubjectsThunk());
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch]);

// Handles open modal.
  const handleOpenModal = (attendance?: Attendance) => {
    if (attendance) {
      setEditingId(attendance.attendance_id || attendance.id || null);
      setFormData(attendance);
    } else {
      setEditingId(null);
      setFormData({ status: 'Present' });
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Present' });
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dispatch(updateAttendance({ id: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createAttendance(formData)).unwrap();
      }
      handleCloseModal();
    } catch {
      // Toast feedback is handled in slice thunks.
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      await dispatch(deleteAttendance(id));
    }
  };

// Memoizes the get filtered derived value.
  const getFiltered = useMemo(
    () => getFilteredAttendance(attendanceItems, students, selectedFolder),
    [selectedFolder, attendanceItems, students]
  );

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

// Memoizes the displayed attendance derived value.
  const displayedAttendance = useMemo(() => {
    let records = getFiltered;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      records = records.filter((record) => {
        const student = students.find((s) => (s.student_id || s.id) === record.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return name.includes(search);
      });
    }
    if (filterStatus) records = records.filter((r) => r.status === filterStatus);
    if (filterDate) {
      records = records.filter((r) => {
        const d = new Date(r.attendance_date).toISOString().split('T')[0];
        return d === filterDate;
      });
    }
    if (filterAgeRange) {
      records = records.filter((r) => matchesAgeRange(r.student_id, filterAgeRange));
    }
    if (filterStudentId) records = records.filter((record) => Number(record.student_id) === Number(filterStudentId));
    if (filterClassId) {
      records = records.filter((record) => {
        const student = students.find((item) => Number(item.student_id || item.id) === Number(record.student_id));
        return Number(record.class_id || student?.class_id || 0) === Number(filterClassId);
      });
    }
    if (filterTeacherId) {
      records = records.filter((record) => {
        const student = students.find((item) => Number(item.student_id || item.id) === Number(record.student_id));
        const studentClass = classes.find((item) => Number(item.class_id || item.id) === Number(record.class_id || student?.class_id || 0));
        return Number(record.teacher_id || studentClass?.teacher_id || student?.teacher_id || 0) === Number(filterTeacherId);
      });
    }
    return records;
  }, [classes, filterClassId, filterDate, filterStatus, filterAgeRange, filterStudentId, filterTeacherId, getFiltered, searchTerm, students]);

  const hasActiveFilters = Boolean(filterStatus || filterDate || searchTerm || filterAgeRange || filterTeacherId || filterClassId || filterStudentId);
// Handles clear filters.
  const clearFilters = () => {
    setSearchTerm(''); setFilterStatus(''); setFilterDate(''); setFilterAgeRange('');
    setFilterTeacherId(''); setFilterClassId(''); setFilterStudentId('');
  };

// Handles folder click.
  const handleFolderClick = (type: 'teacher' | 'class' | 'student' | 'subject', id: number, name: string) => {
    setSelectedFolder({ type, id, name });
    clearFilters();
  };

// Handles back to folders.
  const handleBackToFolders = () => { setSelectedFolder(null); clearFilters(); };

  return {
    state,
    teachers,
    classes,
    students,
    subjects,
    activeTab,
    setActiveTab,
    selectedFolder,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    studentOptions,
    teacherOptions,
    classOptions,
    isLoadingOptions,
    loadingData,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterDate,
    setFilterDate,
    filterAgeRange,
    setFilterAgeRange,
    filterTeacherId,
    setFilterTeacherId,
    filterClassId,
    setFilterClassId,
    filterStudentId,
    setFilterStudentId,
    showFilters,
    setShowFilters,
    displayedAttendance,
    hasActiveFilters,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,
    getStudentName: (studentId: number) => getStudentName(students, studentId),
    getStatusBadgeClasses,
    getStudentIdsForTeacher: (teacherId: number) => getStudentIdsForTeacher(students, teacherId),
    getStudentIdsForClass: (classId: number) => getStudentIdsForClass(students, classId),
    getAttendanceCountForTeacher: (teacherId: number) =>
      getAttendanceCountForTeacher(attendanceItems, students, teacherId),
    getAttendanceCountForClass: (classId: number) =>
      getAttendanceCountForClass(attendanceItems, students, classId),
    getPresentCountForClass: (classId: number) =>
      getPresentCountForClass(attendanceItems, students, classId),
    getAttendanceCountForStudent: (studentId: number) =>
      getAttendanceCountForStudent(attendanceItems, studentId),
    getPresentCountForStudent: (studentId: number) =>
      getPresentCountForStudent(attendanceItems, studentId),
    attendanceStatusOptions,
  };
};
