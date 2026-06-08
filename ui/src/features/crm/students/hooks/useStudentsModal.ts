// React hooks for the crm feature.

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Class, Student } from '../types';
import { useAppSelector } from '../../hooks';

import { studentAPI } from '../../../../shared/api/api';
import { createStudentIdentity } from '../../../../shared/studentIdentity';
import { showToast } from '../../../../utils/toast';
import { getResolvedCenterId } from '../../../../shared/auth/centerScope';

// Provides students modal.
export const useStudentsModal = (selectedClass: Class | null, refreshStudents?: () => void) => {
  const { user } = useAppSelector((state) => state.auth);
  const defaultCenterId = getResolvedCenterId(user) ?? 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({ center_id: defaultCenterId, gender: 'Male', status: 'Active' });
// Handles open modal.
  const handleOpenModal = (student?: Student) => { student ? setFormData({ ...student, password: '' }) : setFormData({ center_id: defaultCenterId, gender: 'Male', status: 'Active', username: '', password: '', class_id: selectedClass ? (selectedClass.class_id || selectedClass.id) : undefined }); setEditingId(student?.student_id || student?.id || null); setIsModalOpen(true); };
// Handles close modal.
  const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ center_id: defaultCenterId, gender: 'Male', status: 'Active', username: '', password: '' }); };
// Handles submit.
  const handleSubmit = async (e: FormEvent) => { 
    e.preventDefault(); 
    try {
      if (editingId) {
        await studentAPI.update(editingId, formData);
        showToast.success('Student updated successfully!');
      } else {
        await studentAPI.create({
          ...formData,
          ...createStudentIdentity(),
        });
        showToast.success('Student created successfully!');
      }
      refreshStudents?.();
      handleCloseModal();
    } catch {
      showToast.error('Error saving student');
    }
  };
// Handles delete.
  const handleDelete = async (id: number) => { 
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentAPI.delete(id);
        showToast.success('Student deleted successfully!');
        refreshStudents?.();
      } catch {
        showToast.error('Error deleting student');
      }
    } 
  };
  return { isModalOpen, editingId, formData, setFormData, handleOpenModal, handleCloseModal, handleSubmit, handleDelete };
};
