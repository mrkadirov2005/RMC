import { useEffect, useMemo, useState } from 'react';
import { useCRUD } from '../../hooks/useCRUD';
import { attendanceAPI, classAPI, studentAPI, teacherAPI } from '../../../../shared/api/api';
import { fetchClasses, fetchStudents, fetchTeachers, attendanceStatusOptions } from '../../../../utils/dropdownOptions';
import type {
  Attendance,
  AttendanceFolderSelection,
  AttendanceTabType,
  Class,
  Student,
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

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

export const useAttendancePage = () => {
  const [state, actions] = useCRUD<Attendance>(attendanceAPI, 'Attendance');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<AttendanceTabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<AttendanceFolderSelection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({ status: 'Present' });
  const [studentOptions, setStudentOptions] = useState<DropdownOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<DropdownOption[]>([]);
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [teachersRes, classesRes, studentsRes] = await Promise.all([
        teacherAPI.getAll(),
        classAPI.getAll(),
        studentAPI.getAll(),
      ]);
      setTeachers(Array.isArray(teachersRes.data || teachersRes) ? (teachersRes.data || teachersRes) : []);
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
      setStudents(Array.isArray(studentsRes.data || studentsRes) ? (studentsRes.data || studentsRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [studentOpts, teacherOpts, classOpts] = await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchClasses(),
      ]);
      setStudentOptions(studentOpts);
      setTeacherOptions(teacherOpts);
      setClassOptions(classOpts);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Present' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      await actions.delete(id);
    }
  };

  const getFiltered = useMemo(
    () => getFilteredAttendance(state.items, students, selectedFolder),
    [selectedFolder, state.items, students]
  );

  const displayedAttendance = useMemo(() => {
    let records = getFiltered;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      records = records.filter((record) => {
        const student = students.find((item) => (item.student_id || item.id) === record.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return studentName.includes(search);
      });
    }

    if (filterStatus) {
      records = records.filter((record) => record.status === filterStatus);
    }

    if (filterDate) {
      records = records.filter((record) => {
        const attendanceDate = new Date(record.attendance_date).toISOString().split('T')[0];
        return attendanceDate === filterDate;
      });
    }

    return records;
  }, [filterDate, filterStatus, getFiltered, searchTerm, students]);

  const hasActiveFilters = Boolean(filterStatus || filterDate || searchTerm);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterDate('');
  };

  const handleFolderClick = (type: 'teacher' | 'class' | 'student', id: number, name: string) => {
    setSelectedFolder({ type, id, name });
    clearFilters();
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  return {
    state,
    teachers,
    classes,
    students,
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
      getAttendanceCountForTeacher(state.items, students, teacherId),
    getAttendanceCountForClass: (classId: number) =>
      getAttendanceCountForClass(state.items, students, classId),
    getPresentCountForClass: (classId: number) =>
      getPresentCountForClass(state.items, students, classId),
    getAttendanceCountForStudent: (studentId: number) =>
      getAttendanceCountForStudent(state.items, studentId),
    getPresentCountForStudent: (studentId: number) =>
      getPresentCountForStudent(state.items, studentId),
    attendanceStatusOptions,
  };
};

