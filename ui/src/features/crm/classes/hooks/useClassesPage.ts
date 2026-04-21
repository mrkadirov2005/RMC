import { useEffect, useState } from 'react';
import { classAPI } from '../../../../shared/api/api';
import { fetchCenters, fetchTeachers, frequencyOptions } from '../../../../utils/dropdownOptions';
import { showToast } from '../../../../utils/toast';
import { useAppSelector } from '../../hooks';
import { useCRUD } from '../../hooks/useCRUD';
import type { Class } from '../types';
import { parseSchedule, weekDays } from '../queries';

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

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

export const useClassesPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = user?.center_id ?? 1;
  const [state, actions] = useCRUD<Class>(classAPI, 'Class');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Class>>({
    center_id: defaultCenterId,
    payment_frequency: 'Monthly',
  });
  const [centerOptions, setCenterOptions] = useState<DropdownOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<DropdownOption[]>([]);
  const [, setIsLoadingOptions] = useState(false);
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

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const teachers = await fetchTeachers();
      setCenterOptions(isOwner ? await fetchCenters() : []);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: defaultCenterId, payment_frequency: 'Monthly' });
    setSelectedDays([]);
    setScheduleTime('09:00');
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setSelectedDays(
      checked ? [...selectedDays, day] : selectedDays.filter((value) => value !== day)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      ...formData,
      section: JSON.stringify({ days: selectedDays, time: scheduleTime }),
    };

    try {
      if (editingId) {
        await actions.update(editingId, dataToSubmit);
        showToast.success('Class updated successfully!');
      } else {
        await actions.create(dataToSubmit);
        showToast.success('Class created successfully!');
      }
      handleCloseModal();
    } catch {
      showToast.error('Error saving class');
    }
  };

  const handleDelete = async (id: number, className?: string) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    setDeleteLoading(true);
    try {
      await classAPI.delete(id);
      showToast.success('Class deleted successfully!');
      await actions.fetchAll();
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

  const handleCloseDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModalOpen(false);
    setDeleteAttendance([]);
    setDeleteTarget(null);
  };

  const handleForceDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await classAPI.delete(deleteTarget.id, { force: true });
      showToast.success('Class and attendance records deleted successfully!');
      await actions.fetchAll();
      handleCloseDeleteModal();
    } catch (error) {
      console.error('Error forcing class delete:', error);
      showToast.error('Failed to delete class');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleViewDetails = (cls: Class) => {
    setSelectedClass(cls);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedClass(null);
  };

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

  const handleGenerateSessions = async (cls: Class) => {
    const classId = Number(cls.class_id || cls.id);
    if (!classId) return;
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const duration = readDuration();
    try {
      await classAPI.generateSessions(classId, {
        month,
        year,
        duration_minutes: duration,
      });
      showToast.success('Sessions generated successfully.');
    } catch (error) {
      console.error('Failed to generate sessions:', error);
      showToast.error('Failed to generate sessions');
    }
  };

  const toLocalDateKey = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
