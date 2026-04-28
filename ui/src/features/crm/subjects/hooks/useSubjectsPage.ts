// React hooks for the crm feature.

import { useEffect, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  createSubject,
  deleteSubject,
  fetchSubjects,
  fetchSubjectsForce,
  updateSubject,
} from '../../../../slices/subjectsSlice';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchTeachers, fetchTeachersForce } from '../../../../slices/teachersSlice';
import { selectClassOptions, selectTeacherOptions } from '../../../../store/selectors';
import type { Subject } from '../types';
import { getStoredActiveCenterId } from '../../../../shared/auth/authStorage';

// Provides subjects page.
export const useSubjectsPage = () => {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.subjects.items) as Subject[];
  const loading = useAppSelector((state) => state.subjects.loading);
  const error = useAppSelector((state) => state.subjects.error);
  const state = { items, loading, error };
  const classOptions = useAppSelector(selectClassOptions);
  const teacherOptions = useAppSelector(selectTeacherOptions);
  const isLoadingOptions = useAppSelector(
    (state) => state.classes.loading || state.teachers.loading
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    total_marks: 100,
    passing_marks: 40,
  });

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchClasses());
    dispatch(fetchTeachers());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      const activeCenterId = getStoredActiveCenterId();
      if (activeCenterId) {
        dispatch(fetchSubjectsForce());
        dispatch(fetchClassesForce());
        dispatch(fetchTeachersForce());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Handles open modal.
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

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ total_marks: 100, passing_marks: 40 });
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dispatch(updateSubject({ id: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createSubject(formData)).unwrap();
      }
      handleCloseModal();
    } catch {
      // Toast feedback is handled in slice thunks.
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await dispatch(deleteSubject(id));
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
