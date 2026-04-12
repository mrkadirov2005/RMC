import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';

export const useStudentsPage = () => {
  const data = useStudentsData();
  const filters = useStudentsFilters(data.state.items);
  const modal = useStudentsModal(data.actions, filters.selectedClass);
  return {
    ...data,
    ...filters,
    ...modal,
    genderOptions: [
      { id: 1, label: 'Male', value: 'Male' },
      { id: 2, label: 'Female', value: 'Female' },
      { id: 3, label: 'Other', value: 'Other' },
    ],
    statusOptions: [
      { id: 1, label: 'Active', value: 'Active' },
      { id: 2, label: 'Inactive', value: 'Inactive' },
      { id: 3, label: 'Suspended', value: 'Suspended' },
    ],
  };
};
