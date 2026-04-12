import { useEffect, useState } from 'react';
import { debtAPI } from '../../../../shared/api/api';
import { fetchCenters, fetchStudents } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useCRUD } from '../../hooks/useCRUD';
import type { Debt } from '../types';

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

export const useDebtsPage = () => {
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = user?.center_id ?? 1;
  const [state, actions] = useCRUD<Debt>(debtAPI, 'Debt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Debt>>({ center_id: defaultCenterId, amount_paid: 0 });
  const [studentOptions, setStudentOptions] = useState<DropdownOption[]>([]);
  const [centerOptions, setCenterOptions] = useState<DropdownOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const students = await fetchStudents();
      setStudentOptions(students);
      setCenterOptions(isOwner ? await fetchCenters() : []);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (debt?: Debt) => {
    if (debt) {
      setEditingId(debt.debt_id || debt.id || null);
      setFormData(debt);
    } else {
      setEditingId(null);
      setFormData({ center_id: defaultCenterId, amount_paid: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: defaultCenterId, amount_paid: 0 });
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
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      await actions.delete(id);
    }
  };

  const getStudentName = (studentId: number) => {
    const student = studentOptions.find((s) => s.id === studentId);
    return student ? student.label : `Student ${studentId}`;
  };

  return {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    studentOptions,
    centerOptions,
    isLoadingOptions,
    isOwner,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    getStudentName,
  };
};
