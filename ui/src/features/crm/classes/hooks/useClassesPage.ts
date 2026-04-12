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

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await actions.delete(id);
        showToast.success('Class deleted successfully!');
      } catch {
        showToast.error('Error deleting class');
      }
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
    detailModalOpen,
    selectedClass,
    handleViewDetails,
    handleCloseDetailModal,
    frequencyOptions,
    isOwner,
  };
};
