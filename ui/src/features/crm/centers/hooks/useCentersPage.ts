import { useEffect, useState } from 'react';
import { centerAPI } from '../../../../shared/api/api';
import { useCRUD } from '../../hooks/useCRUD';
import { showToast } from '../../../../utils/toast';
import type { Center } from '../types';

export const useCentersPage = () => {
  const [state, actions] = useCRUD<Center>(centerAPI, 'Center');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Center>>({});

  useEffect(() => {
    actions.fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await actions.update(editingId, formData);
        showToast.success('Center updated successfully!');
      } else {
        await actions.create(formData);
        showToast.success('Center created successfully!');
      }
      handleCloseModal();
    } catch {
      showToast.error('Error saving center');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this center?')) {
      try {
        await actions.delete(id);
        showToast.success('Center deleted successfully!');
      } catch {
        showToast.error('Error deleting center');
      }
    }
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
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    columns,
  };
};

