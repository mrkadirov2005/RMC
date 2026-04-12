import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teacherAPI } from '../../../../shared/api/api';
import { fetchCenters, genderOptions, teacherStatusOptions } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useCRUD } from '../../hooks/useCRUD';
import type { Teacher } from '../types';
import { getInitials, getStatusColor } from '../queries';

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

export const useTeachersPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = user?.center_id ?? 1;
  const [state, actions] = useCRUD<Teacher>(teacherAPI, 'Teacher');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({
    center_id: defaultCenterId,
    gender: 'Male',
    status: 'Active',
    roles: ['teacher'],
  });
  const [centerOptions, setCenterOptions] = useState<DropdownOption[]>([]);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    try {
      setCenterOptions(isOwner ? await fetchCenters() : []);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.teacher_id || teacher.id || null);
      setFormData(teacher);
    } else {
      setEditingId(null);
      setFormData({
        center_id: defaultCenterId,
        gender: 'Male',
        status: 'Active',
        roles: ['teacher'],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: defaultCenterId,
      gender: 'Male',
      status: 'Active',
      roles: ['teacher'],
    });
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
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      await actions.delete(id);
    }
  };

  return {
    navigate,
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    centerOptions,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    getStatusColor,
    getInitials,
    genderOptions,
    teacherStatusOptions,
    isOwner,
  };
};
