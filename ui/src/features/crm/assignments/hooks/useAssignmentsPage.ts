import { useEffect, useMemo, useState } from 'react';
import { assignmentAPI, classAPI } from '../../../../shared/api/api';
import { fetchClasses, assignmentStatusOptions } from '../../../../utils/dropdownOptions';
import { useCRUD } from '../../hooks/useCRUD';
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

interface DropdownOption {
  id?: number;
  label: string;
  value: string | number;
}

export const useAssignmentsPage = () => {
  const [state, actions] = useCRUD<Assignment>(assignmentAPI, 'Assignment');
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState<AssignmentTabType>('classes');
  const [selectedFolder, setSelectedFolder] = useState<AssignmentFolderSelection | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({ status: 'Pending' });
  const [classOptions, setClassOptions] = useState<DropdownOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
    loadDropdownOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const classesRes = await classAPI.getAll();
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      setClassOptions(await fetchClasses());
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Pending' });
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
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      await actions.delete(id);
    }
  };

  const getFiltered = useMemo(
    () => getFilteredAssignments(state.items, classes, selectedFolder),
    [classes, selectedFolder, state.items]
  );

  const displayedAssignments = useMemo(() => {
    let assignments = getFiltered;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      assignments = assignments.filter(
        (assignment) =>
          assignment.assignment_title?.toLowerCase().includes(search) ||
          assignment.description?.toLowerCase().includes(search)
      );
    }

    if (filterStatus) {
      assignments = assignments.filter((assignment) => assignment.status === filterStatus);
    }

    return assignments;
  }, [filterStatus, getFiltered, searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const hasActiveFilters = Boolean(searchTerm || filterStatus);
  const personalAssignments = useMemo(() => getPersonalAssignments(state.items, classes), [classes, state.items]);

  const handleFolderClick = (type: 'class' | 'personal', id: number | undefined, name: string) => {
    setSelectedFolder({ type, id, name });
  };

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
    loadingData,
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
    getAssignmentCountForClass: (classId: number) => getAssignmentCountForClass(state.items, classId),
    getCompletedCountForClass: (classId: number) => getCompletedCountForClass(state.items, classId),
    assignmentStatusOptions,
  };
};

