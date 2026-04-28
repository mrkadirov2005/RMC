// React hooks for the crm feature.

import { useEffect, useState } from 'react';
import { classAPI } from '../../../../shared/api/api';
import { frequencyOptions } from '../../../../utils/dropdownOptions';
import { showToast } from '../../../../utils/toast';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchTeachers } from '../../../../slices/teachersSlice';
import { fetchCenters } from '../../../../slices/centersSlice';
import { selectCenterOptions, selectTeacherOptions } from '../../../../store/selectors';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';
import type { Class } from '../types';
import { parseSchedule, weekDays } from '../queries';

interface AttendanceRecord {
  attendance_id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  session_id?: number | null;
  attendance_date: string;
  status: string;
  remarks?: string;
}

// Provides classes page.
export const useClassesPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = getResolvedCenterId(user) ?? 0;

  const items = useAppSelector((state) => state.classes.items) as Class[];
  const loading = useAppSelector((state) => state.classes.loading);
  const error = useAppSelector((state) => state.classes.error);
  const state = { items, loading, error };
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];
  const teacherOptions = useAppSelector(selectTeacherOptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Class>>({
    center_id: defaultCenterId,
    payment_frequency: 'Monthly',
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const defaultDurationKey = 'lesson_duration_default';
  const overrideDurationKey = 'lesson_duration_override';
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name?: string } | null>(null);
  const [deleteAttendance, setDeleteAttendance] = useState<AttendanceRecord[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchClasses());
    dispatch(fetchTeachers());
    if (isOwner) {
      dispatch(fetchCenters());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchClassesForce());
      dispatch(fetchTeachers());
      if (isOwner) {
        dispatch(fetchCenters());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner]);

// Handles open modal.
  const handleOpenModal = (cls?: Class) => {
    if (cls) {
      setEditingId(cls.class_id || cls.id || null);
      setFormData(cls);
      const schedule = parseSchedule(cls.section);
      setSelectedDays(schedule.days);
      setScheduleTime(schedule.time);
    } else {
      setEditingId(null);
      setFormData({ center_id: defaultCenterId, payment_frequency: 'Monthly' });
      setSelectedDays([]);
      setScheduleTime('09:00');
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: defaultCenterId, payment_frequency: 'Monthly' });
    setSelectedDays([]);
    setScheduleTime('09:00');
  };

// Handles day change.
  const handleDayChange = (day: string, checked: boolean) => {
    setSelectedDays(
      checked ? [...selectedDays, day] : selectedDays.filter((v) => v !== day)
    );
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      section: JSON.stringify({ days: selectedDays, time: scheduleTime }),
    };
    try {
      if (editingId) {
        await classAPI.update(editingId, dataToSubmit);
        showToast.success('Class updated successfully!');
      } else {
        await classAPI.create(dataToSubmit);
        showToast.success('Class created successfully!');
      }
      dispatch(fetchClassesForce());
      handleCloseModal();
    } catch {
      showToast.error('Error saving class');
    }
  };

// Handles delete.
  const handleDelete = async (id: number, className?: string) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    setDeleteLoading(true);
    try {
      await classAPI.delete(id);
      showToast.success('Class deleted successfully!');
      dispatch(fetchClassesForce());
    } catch (error: any) {
      const status = error?.response?.status;
      const attendance = error?.response?.data?.attendance;
      if (status === 409 && Array.isArray(attendance)) {
        setDeleteAttendance(attendance as AttendanceRecord[]);
        setDeleteTarget({ id, name: className });
        setDeleteModalOpen(true);
        return;
      }
      showToast.error('Error deleting class');
    } finally {
      setDeleteLoading(false);
    }
  };

// Handles close delete modal.
  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteAttendance([]);
    setDeleteTarget(null);
  };

// Handles force delete.
  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await classAPI.delete(deleteTarget.id, { force: true });
      showToast.success('Class and attendance records deleted successfully!');
      dispatch(fetchClassesForce());
      handleCloseDeleteModal();
    } catch (e) {
      console.error('Error forcing class delete:', e);
      showToast.error('Failed to delete class');
    } finally {
      setDeleteLoading(false);
    }
  };

// Handles view details.
  const handleViewDetails = (cls: Class) => {
    setSelectedClass(cls);
    setDetailModalOpen(true);
  };

// Handles close detail modal.
  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedClass(null);
  };

// Reads duration.
  const readDuration = () => {
    try {
      const overrideRaw = localStorage.getItem(overrideDurationKey);
      const overrideValue = Number(overrideRaw);
      if (Number.isFinite(overrideValue) && overrideValue > 0) return overrideValue;
      const defaultRaw = localStorage.getItem(defaultDurationKey);
      const defaultValue = Number(defaultRaw);
      return Number.isFinite(defaultValue) && defaultValue > 0 ? defaultValue : 90;
    } catch {
      return 90;
    }
  };

// Handles generate sessions.
  const handleGenerateSessions = async (cls: Class) => {
    const classId = Number(cls.class_id || cls.id);
    if (!classId) return;
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const duration = readDuration();
    try {
      await classAPI.generateSessions(classId, { month, year, duration_minutes: duration });
      showToast.success('Sessions generated successfully.');
    } catch (e) {
      console.error('Failed to generate sessions:', e);
      showToast.error('Failed to generate sessions');
    }
  };

  return {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    teacherOptions,
    selectedDays,
    scheduleTime,
    setScheduleTime,
    handleDayChange,
    weekDays,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    deleteModalOpen,
    deleteTarget,
    deleteAttendance,
    deleteLoading,
    handleCloseDeleteModal,
    handleForceDelete,
    detailModalOpen,
    selectedClass,
    handleViewDetails,
    handleCloseDetailModal,
    handleGenerateSessions,
    frequencyOptions,
    isOwner,
  };
};
