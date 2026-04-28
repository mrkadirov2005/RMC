// React hooks for the crm feature.

import { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  createDebt,
  deleteDebt,
  fetchDebts,
  fetchDebtsForce,
  updateDebt,
} from '../../../../slices/debtsSlice';
import { fetchStudents } from '../../../../slices/studentsSlice';
import { fetchCenters } from '../../../../slices/centersSlice';
import {
  selectCenterOptions,
  selectStudentOptions,
  selectStudentsByIdMap,
} from '../../../../store/selectors';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';
import type { Debt } from '../types';

// Provides debts page.
export const useDebtsPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = getResolvedCenterId(user) ?? 0;

  const items = useAppSelector((state) => state.debts.items) as Debt[];
  const loading = useAppSelector((state) => state.debts.loading);
  const error = useAppSelector((state) => state.debts.error);
  const state = { items, loading, error };
  const studentOptions = useAppSelector(selectStudentOptions);
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];
  const studentsById = useAppSelector(selectStudentsByIdMap);
  const isLoadingOptions = useAppSelector(
    (state) => state.students.loading || (isOwner && state.centers.loading)
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Debt>>({ center_id: defaultCenterId, amount_paid: 0 });

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchDebts());
    dispatch(fetchStudents());
    if (isOwner) {
      dispatch(fetchCenters());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchDebtsForce());
      dispatch(fetchStudents());
      if (isOwner) {
        dispatch(fetchCenters());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner]);

// Handles open modal.
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

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: defaultCenterId, amount_paid: 0 });
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dispatch(updateDebt({ id: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createDebt(formData)).unwrap();
      }
      handleCloseModal();
    } catch {
      // Toast feedback is handled in slice thunks.
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      await dispatch(deleteDebt(id));
    }
  };

// Returns student name.
  const getStudentName = (studentId: number) => {
    const student = studentsById[studentId];
    if (!student) return `Student ${studentId}`;
    const firstName = String(student?.first_name || '').trim();
    const lastName = String(student?.last_name || '').trim();
    return [firstName, lastName].filter(Boolean).join(' ') || `Student ${studentId}`;
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
