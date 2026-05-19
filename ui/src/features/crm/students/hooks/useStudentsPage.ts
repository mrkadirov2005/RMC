// React hooks for the crm feature.

import { useStudentsData } from './useStudentsData';
import { useStudentsFilters } from './useStudentsFilters';
import { useStudentsModal } from './useStudentsModal';

// Provides students page.
export const useStudentsPage = () => {
  const filters = useStudentsFilters([]);
  const data = useStudentsData(filters.studentParams);
  const modal = useStudentsModal(filters.selectedClass, data.actions.fetchAll);
  return {
    ...data,
    ...filters,
    ...modal,
    displayedStudents: data.state.items,
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
