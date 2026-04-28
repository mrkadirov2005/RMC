// React hooks for the crm feature.

import { useEffect, useState } from 'react';
import { centerAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchCentersForce } from '../../../../slices/centersSlice';
import type { Center } from '../types';
import { getStoredActiveCenterId, setStoredActiveCenterId } from '../../../../shared/auth/authStorage';

// Provides centers page.
export const useCentersPage = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.centers.items) as Center[];
  const loading = useAppSelector((state) => state.centers.loading);
  const error = useAppSelector((state) => state.centers.error);
  const state = { items, loading, error };
  const [activeCenterId, setActiveCenterId] = useState<number | null>(getStoredActiveCenterId());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Center>>({});

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchCentersForce());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Runs side effects for this component.
  useEffect(() => {
// Handles sync active center.
    const syncActiveCenter = () => setActiveCenterId(getStoredActiveCenterId());
    syncActiveCenter();
    window.addEventListener('active-center-changed', syncActiveCenter);
    return () => window.removeEventListener('active-center-changed', syncActiveCenter);
  }, []);

// Runs side effects for this component.
  useEffect(() => {
    if (!items.length) return;
    const storedCenterId = getStoredActiveCenterId();
    const isStoredValid = storedCenterId ? items.some((center) => Number(center.center_id || center.id) === storedCenterId) : false;
    if (!storedCenterId || !isStoredValid) {
      const firstId = Number(items[0].center_id || items[0].id || 0);
      if (firstId > 0) {
        setStoredActiveCenterId(firstId);
        setActiveCenterId(firstId);
      }
    }
  }, [items]);

// Handles open modal.
  const handleOpenModal = (center?: Center) => {
    if (center) {
      setEditingId(center.center_id || center.id || null);
      setFormData(center);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

// Handles submit.
  const handleSubmit = async () => {
    try {
      if (editingId) {
        const response = await centerAPI.update(editingId, formData);
        const updated = response?.data ?? response;
        const updatedId = Number(updated?.center_id || updated?.id || editingId);
        if (updatedId > 0 && updatedId === activeCenterId) {
          setStoredActiveCenterId(updatedId);
        }
        showToast.success('Center updated successfully!');
      } else {
        const response = await centerAPI.create(formData);
        const created = response?.data ?? response;
        const createdId = Number(created?.center_id || created?.id || 0);
        if (createdId > 0) {
          setStoredActiveCenterId(createdId);
          setActiveCenterId(createdId);
        }
        showToast.success('Center created successfully!');
      }
      dispatch(fetchCentersForce());
      handleCloseModal();
    } catch {
      showToast.error('Error saving center');
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this center?')) {
      try {
        await centerAPI.delete(id);
        if (Number(id) === Number(activeCenterId)) {
          setStoredActiveCenterId(null);
        }
        showToast.success('Center deleted successfully!');
        dispatch(fetchCentersForce());
      } catch {
        showToast.error('Error deleting center');
      }
    }
  };

// Handles activate center.
  const handleActivateCenter = (id: number) => {
    const normalizedId = Number(id);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return;
    setActiveCenterId(normalizedId);
    setStoredActiveCenterId(normalizedId);
    showToast.success('Active branch updated');
  };

  const columns = [
    { key: 'center_code', label: 'Code' },
    { key: 'center_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'principal_name', label: 'Principal' },
  ];

  return {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    activeCenterId,
    handleActivateCenter,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    columns,
  };
};
