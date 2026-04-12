import { useEffect, useState } from 'react';
import { subjectAPI } from '../../../../shared/api/api';
import { fetchClasses, fetchTeachers } from '../../../../utils/dropdownOptions';
import { useCRUD } from '../../hooks/useCRUD';
import type { Subject } from '../types';
import { getStoredActiveCenterId } from '../../../../shared/auth/authStorage';

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

export const useSubjectsPage = () => {
  const [state, actions] = useCRUD<Subject>(subjectAPI, 'Subject');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    total_marks: 100,
    passing_marks: 40,
  });
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<DropdownOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleActiveCenterChanged = () => {
      const activeCenterId = getStoredActiveCenterId();
      if (activeCenterId) {
        actions.fetchAll();
        loadDropdownOptions();
      }
    };

    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [actions]);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [classes, teachers] = await Promise.all([fetchClasses(), fetchTeachers()]);
      setClassOptions(classes);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setEditingId(subject.subject_id || subject.id || null);
      setFormData(subject);
    } else {
      setEditingId(null);
      setFormData({ total_marks: 100, passing_marks: 40 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ total_marks: 100, passing_marks: 40 });
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
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await actions.delete(id);
    }
  };

  return {
    state,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    classOptions,
    teacherOptions,
    isLoadingOptions,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
  };
};

