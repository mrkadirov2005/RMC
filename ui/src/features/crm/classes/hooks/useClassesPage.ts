// React hooks for the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { classAPI, dataAPI, roomAPI, subjectAPI } from '../../../../shared/api/api';
import { frequencyOptions } from '../../../../utils/dropdownOptions';
import { handleApiError, showToast } from '../../../../utils/toast';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchRooms, fetchRoomsForce } from '../../../../slices/roomsSlice';
import { fetchTeachers } from '../../../../slices/teachersSlice';
import { fetchCenters } from '../../../../slices/centersSlice';
import { fetchSubjects, fetchSubjectsForce } from '../../../../slices/subjectsSlice';
import { selectCenterOptions, selectTeacherOptions } from '../../../../store/selectors';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';
import type { Class } from '../types';
import { parseSchedule, weekDays } from '../queries';
import { buildAssignableSubjectOptions, buildClassSubjectAssignment, hasPersistedClassSubject } from '../subjectOptions';
import { findClassRoomConflict } from '../classRoomConflict';

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
export const useClassesPage = (onSaved?: () => void) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = getResolvedCenterId(user) ?? 0;

  const items = useAppSelector((state) => state.classes.items) as Class[];
  const rooms = useAppSelector((state) => state.rooms.items) as any[];
  const loading = useAppSelector((state) => state.classes.loading);
  const error = useAppSelector((state) => state.classes.error);
  const state = { items, loading, error };
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const subjects = useAppSelector((state) => state.subjects.items);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const subjectOptions = buildAssignableSubjectOptions(subjects);
  const [formData, setFormData] = useState<Partial<Class>>({
    center_id: defaultCenterId,
    payment_frequency: 'Monthly',
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('10:00');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const defaultDurationKey = 'lesson_duration_default';
  const overrideDurationKey = 'lesson_duration_override';
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name?: string } | null>(null);
  const [deleteAttendance, setDeleteAttendance] = useState<AttendanceRecord[]>([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [physicalRooms, setPhysicalRooms] = useState<any[]>([]);
  const roomConflict = useMemo(() => findClassRoomConflict({ classes: items, assignments: rooms, room: formData.room_number, days: selectedDays, start: scheduleTime, end: scheduleEndTime, editingId }), [editingId, formData.room_number, items, rooms, scheduleEndTime, scheduleTime, selectedDays]);

  const loadPhysicalRooms = async () => {
    try {
      const response = await roomAPI.getPhysical();
      const data = (response as any)?.data?.data ?? (response as any)?.data ?? response;
      setPhysicalRooms(Array.isArray(data) ? data : []);
    } catch {
      setPhysicalRooms([]);
    }
  };

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchClasses());
    dispatch(fetchRooms());
    dispatch(fetchTeachers());
    dispatch(fetchSubjects());
    void loadPhysicalRooms();
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
      dispatch(fetchRoomsForce());
      dispatch(fetchTeachers());
      dispatch(fetchSubjectsForce());
      void loadPhysicalRooms();
      if (isOwner) {
        dispatch(fetchCenters());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner]);

// Handles open modal.
  const handleOpenModal = (cls?: Class) => {
    dispatch(fetchRoomsForce());
    void loadPhysicalRooms();
    if (cls) {
      setEditingId(cls.class_id || cls.id || null);
      setFormData(cls);
      const schedule = parseSchedule(cls.section);
      setSelectedDays(schedule.days);
      setScheduleTime(schedule.time);
      setScheduleEndTime(schedule.endTime || '10:00');
    } else {
      setEditingId(null);
      setFormData({ center_id: defaultCenterId, payment_frequency: 'Monthly' });
      setSelectedDays([]);
      setScheduleTime('09:00');
      setScheduleEndTime('10:00');
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
    setScheduleEndTime('10:00');
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
    if (roomConflict) {
      showToast.error(`Room ${formData.room_number} is already booked by ${roomConflict.group} on ${roomConflict.day}, ${roomConflict.start}–${roomConflict.end}.`);
      return;
    }
    const dataToSubmit = {
      ...formData,
      section: JSON.stringify({ days: selectedDays, time: scheduleTime, endTime: scheduleEndTime }),
    };
    try {
      if (editingId) {
        await classAPI.update(editingId, dataToSubmit);
        if (formData.subject_id && formData.subject_name) {
          let verifyResponse = await classAPI.getById(editingId);
          let verifiedClass = (verifyResponse as any)?.data ?? verifyResponse;
          if (!hasPersistedClassSubject(verifiedClass, formData.subject_name)) {
            const selectedSubject = subjects.find((subject: any) =>
              Number(subject?.subject_id || subject?.id) === Number(formData.subject_id)
            );
            if (!selectedSubject) throw new Error('The selected subject could not be found. Refresh the page and try again.');
            await subjectAPI.create(buildClassSubjectAssignment(selectedSubject, {
              ...formData,
              class_id: editingId,
            }));
            verifyResponse = await classAPI.getById(editingId);
            verifiedClass = (verifyResponse as any)?.data ?? verifyResponse;
          }
          if (!hasPersistedClassSubject(verifiedClass, formData.subject_name)) {
            throw new Error('The class was updated, but the selected subject was not saved.');
          }
        }
        showToast.success('Class updated successfully!');
      } else {
        await classAPI.create(dataToSubmit);
        showToast.success('Class created successfully!');
      }
      await Promise.all([
        dispatch(fetchClassesForce()),
        dispatch(fetchSubjectsForce()),
      ]);
      handleCloseModal();
      onSaved?.();
    } catch (error) {
      showToast.error(handleApiError(error) || 'Error saving class');
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
      showToast.error(handleApiError(error) || 'Error deleting class');
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
      showToast.error(handleApiError(e) || 'Failed to delete class');
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
      showToast.error(handleApiError(e));
    }
  };

// Handles CSV import.
  const handleImportClasses = async (file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      showToast.error('Please choose a CSV file.');
      return;
    }

    try {
      setIsImporting(true);
      const csv = await file.text();
      await dataAPI.importEntity('classes', csv);
      showToast.success('Classes imported successfully.');
      dispatch(fetchClassesForce());
    } catch (error) {
      showToast.error(handleApiError(error) || 'Failed to import classes.');
    } finally {
      setIsImporting(false);
    }
  };

// Handles bulk delete.
  const handleBulkDelete = async (ids: number[]) => {
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} selected class${ids.length === 1 ? '' : 'es'}?`)) return;

    let failed = 0;
    for (const id of ids) {
      try {
        await classAPI.delete(id);
      } catch {
        failed += 1;
      }
    }
    dispatch(fetchClassesForce());
    if (failed > 0) {
      showToast.error(`Deleted ${ids.length - failed}; ${failed} failed.`);
    } else {
      showToast.success(`Deleted ${ids.length} class${ids.length === 1 ? '' : 'es'}.`);
    }
  };

  return {
    state,
    rooms,
    physicalRooms,
    roomConflict,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    teacherOptions,
    subjectOptions,
    selectedDays,
    scheduleTime,
    scheduleEndTime,
    setScheduleTime,
    setScheduleEndTime,
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
    handleImportClasses,
    handleBulkDelete,
    isImporting,
    frequencyOptions,
    isOwner,
  };
};
