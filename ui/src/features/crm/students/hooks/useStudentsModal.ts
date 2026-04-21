import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Class, Student } from '../types';
import { useAppSelector } from '../../hooks';

interface Actions { update: (id: number, data: Partial<Student>) => Promise<boolean>; create: (data: Partial<Student>) => Promise<boolean>; delete: (id: number) => Promise<boolean> }

export const useStudentsModal = (actions: Actions, selectedClass: Class | null) => {
  const { user } = useAppSelector((state) => state.auth);
  const defaultCenterId = user?.center_id ?? 1;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({ center_id: defaultCenterId, gender: 'Male', status: 'Active' });
  const handleOpenModal = (student?: Student) => { student ? setFormData({ ...student, password: '' }) : setFormData({ center_id: defaultCenterId, gender: 'Male', status: 'Active', username: '', password: '', class_id: selectedClass ? (selectedClass.class_id || selectedClass.id) : undefined }); setEditingId(student?.student_id || student?.id || null); setIsModalOpen(true); };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ center_id: defaultCenterId, gender: 'Male', status: 'Active', username: '', password: '' }); };
  const handleSubmit = async (e: FormEvent) => { 
    e.preventDefault(); 
    const success = editingId 
      ? await actions.update(editingId, formData)
      : await actions.create(formData);
    if (success) {
      handleCloseModal();
    }
  };
  const handleDelete = async (id: number) => { if (window.confirm('Are you sure you want to delete this student?')) await actions.delete(id); };
  return { isModalOpen, editingId, formData, setFormData, handleOpenModal, handleCloseModal, handleSubmit, handleDelete };
};
