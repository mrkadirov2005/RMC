// React hooks for the crm feature.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { genderOptions, teacherStatusOptions } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchTeachers, fetchTeachersForce, createTeacher, updateTeacher, deleteTeacher, type TeacherListParams } from '../../../../slices/teachersSlice';
import { fetchCenters } from '../../../../slices/centersSlice';
import { selectCenterOptions } from '../../../../store/selectors';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';
import type { Teacher } from '../types';
import { getInitials, getStatusColor } from '../queries';

const DEFAULT_TEACHER_PASSWORD = '012345678';

const getEmptyTeacherForm = (centerId: number): Partial<Teacher> => ({
  center_id: centerId,
  gender: 'Male',
  status: 'Active',
  salary_percentage: 50,
  roles: ['teacher'],
  password: DEFAULT_TEACHER_PASSWORD,
});

// Provides teachers page.
export const useTeachersPage = (teacherParams?: TeacherListParams) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { items, loading, error, meta } = useAppSelector((state) => state.teachers);
// Handles is owner.
  const isOwner = (user?.role || '').toLowerCase() === 'owner';
  const defaultCenterId = getResolvedCenterId(user) ?? 0;
  const allCenterOptions = useAppSelector(selectCenterOptions);
  const centerOptions = isOwner ? allCenterOptions : [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>(getEmptyTeacherForm(defaultCenterId));

  // Expose state shape compatible with useCRUD for UI pages that read state.items / state.loading / state.error
  const state = { items, loading, error, meta };

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchTeachers(teacherParams));
    if (isOwner) {
      dispatch(fetchCenters());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, JSON.stringify(teacherParams)]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchTeachersForce(teacherParams));
      if (isOwner) {
        dispatch(fetchCenters());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isOwner, teacherParams]);

// Handles open modal.
  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.teacher_id || teacher.id || null);
      setFormData(teacher);
    } else {
      setEditingId(null);
      setFormData(getEmptyTeacherForm(defaultCenterId));
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(getEmptyTeacherForm(defaultCenterId));
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await dispatch(updateTeacher({ id: editingId, data: formData }));
    } else {
      await dispatch(createTeacher(formData));
    }
    handleCloseModal();
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      dispatch(deleteTeacher(id));
    }
  };

  /** Force-refresh from the server (e.g. after external mutation) */
  const refresh = () => dispatch(fetchTeachersForce(teacherParams));

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
    refresh,
    getStatusColor,
    getInitials,
    genderOptions,
    teacherStatusOptions,
    isOwner,
    user,
  };
};
