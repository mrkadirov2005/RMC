// React hooks for the crm feature.

import { useEffect, useMemo, useState } from 'react';
import { assignmentStatusOptions } from '../../../../utils/dropdownOptions';
import { useAppSelector } from '../../hooks';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  createAssignment,
  deleteAssignment,
  fetchAssignments,
  fetchAssignmentsForce,
  updateAssignment,
} from '../../../../slices/assignmentsSlice';
import { fetchClasses } from '../../../../slices/classesSlice';
import { selectClassOptions } from '../../../../store/selectors';
import type {
  Assignment,
  AssignmentFolderSelection,
  AssignmentTabType,
  Class,
} from '../types';
import {
  getAssignmentCountForClass,
  getCompletedCountForClass,
  getFilteredAssignments,
  getPersonalAssignments,
} from '../queries';

// Provides assignments page.
export const useAssignmentsPage = () => {
  const dispatch = useAppDispatch();

  const assignmentItems = useAppSelector((state) => state.assignments.items) as Assignment[];
  const assignmentsLoading = useAppSelector((state) => state.assignments.loading);
  const assignmentsError = useAppSelector((state) => state.assignments.error);
  const classItems = useAppSelector((state) => state.classes.items) as Class[];
  const classesLoading = useAppSelector((state) => state.classes.loading);

  const state = { items: assignmentItems, loading: assignmentsLoading || classesLoading, error: assignmentsError };
  const classes = classItems;
  const classOptions = useAppSelector(selectClassOptions);
  const isLoadingOptions = useAppSelector((state) => state.classes.loading);

  const [activeTab, setActiveTab] = useState<AssignmentTabType>('classes');
  const [selectedFolder, setSelectedFolder] = useState<AssignmentFolderSelection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({ status: 'Pending' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchAssignments());
    dispatch(fetchClasses());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchAssignmentsForce());
      dispatch(fetchClasses());
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch]);

// Handles open modal.
  const handleOpenModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingId(assignment.assignment_id || assignment.id || null);
      setFormData(assignment);
    } else {
      setEditingId(null);
      setFormData({ status: 'Pending' });
    }
    setIsModalOpen(true);
  };

// Handles close modal.
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Pending' });
  };

// Handles submit.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await dispatch(updateAssignment({ id: editingId, data: formData })).unwrap();
      } else {
        await dispatch(createAssignment(formData)).unwrap();
      }
      handleCloseModal();
    } catch {
      // Toast feedback is handled in slice thunks.
    }
  };

// Handles delete.
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      await dispatch(deleteAssignment(id));
    }
  };

// Memoizes the get filtered derived value.
  const getFiltered = useMemo(
    () => getFilteredAssignments(assignmentItems, classes, selectedFolder),
    [classes, selectedFolder, assignmentItems]
  );

// Memoizes the displayed assignments derived value.
  const displayedAssignments = useMemo(() => {
    let assignments = getFiltered;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      assignments = assignments.filter(
        (a) => a.assignment_title?.toLowerCase().includes(search) || a.description?.toLowerCase().includes(search)
      );
    }
    if (filterStatus) {
      assignments = assignments.filter((a) => a.status === filterStatus);
    }
    return assignments;
  }, [filterStatus, getFiltered, searchTerm]);

// Handles clear filters.
  const clearFilters = () => { setSearchTerm(''); setFilterStatus(''); };
  const hasActiveFilters = Boolean(searchTerm || filterStatus);
// Memoizes the personal assignments derived value.
  const personalAssignments = useMemo(() => getPersonalAssignments(assignmentItems, classes), [classes, assignmentItems]);

// Handles folder click.
  const handleFolderClick = (type: 'class' | 'personal', id: number | undefined, name: string) => {
    setSelectedFolder({ type, id, name });
  };

// Handles back to folders.
  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  return {
    state,
    classes,
    activeTab,
    setActiveTab,
    selectedFolder,
    isModalOpen,
    editingId,
    formData,
    setFormData,
    classOptions,
    isLoadingOptions,
    loadingData: classesLoading,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    showFilters,
    setShowFilters,
    displayedAssignments,
    hasActiveFilters,
    personalAssignments,
    handleOpenModal,
    handleCloseModal,
    handleSubmit,
    handleDelete,
    handleFolderClick,
    handleBackToFolders,
    clearFilters,
    getAssignmentCountForClass: (classId: number) => getAssignmentCountForClass(assignmentItems, classId),
    getCompletedCountForClass: (classId: number) => getCompletedCountForClass(assignmentItems, classId),
    assignmentStatusOptions,
  };
};
