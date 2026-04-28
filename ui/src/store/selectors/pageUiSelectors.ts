// Redux selectors for derived application state.

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { selectAssignedTestsBuckets, selectTestsItems } from './testsSelectors';

// Selects app ui.
export const selectAppUi = (state: RootState) => state.pagesUi.app;

// Selects payments page ui.
export const selectPaymentsPageUi = (state: RootState) => state.pagesUi.payments;
export const selectPaymentsHasActiveFilters = createSelector([selectPaymentsPageUi], (ui) =>
  Boolean(ui.searchTerm || ui.filterStatus || ui.filterMethod)
);

// Selects grades page ui.
export const selectGradesPageUi = (state: RootState) => state.pagesUi.grades;
export const selectGradesHasActiveFilters = createSelector([selectGradesPageUi], (ui) =>
  Boolean(ui.searchTerm || ui.filterTerm || ui.filterGrade)
);

// Selects tests page ui.
export const selectTestsPageUi = (state: RootState) => state.pagesUi.tests;
export const selectTestsPageSelectedTest = createSelector(
  [selectTestsItems, selectTestsPageUi],
  (tests, ui) => tests.find((test) => Number(test?.test_id) === Number(ui.selectedTestId)) || null
);

// Handles make select filtered tests for page ui.
export const makeSelectFilteredTestsForPageUi = () =>
  createSelector([selectTestsItems, selectTestsPageUi], (tests, ui) => {
    const normalizedSearch = ui.searchTerm.trim().toLowerCase();

    return tests.filter((test) => {
      const name = String(test?.test_name || '').toLowerCase();
      const description = String(test?.description || '').toLowerCase();
      const type = String(test?.test_type || '');

      const matchesSearch =
        normalizedSearch.length === 0 || name.includes(normalizedSearch) || description.includes(normalizedSearch);
      const matchesType = ui.filterType === 'all' || type === ui.filterType;
      const matchesTab =
        ui.tabValue === 'all' ||
        (ui.tabValue === 'active' && Boolean(test?.is_active)) ||
        (ui.tabValue === 'inactive' && !Boolean(test?.is_active));

      return matchesSearch && matchesType && matchesTab;
    });
  });

// Selects student tests page ui.
export const selectStudentTestsPageUi = (state: RootState) => state.pagesUi.studentTests;
export const selectStudentTestsVisibleForPageUi = createSelector(
  [selectAssignedTestsBuckets, selectStudentTestsPageUi],
  (buckets, ui) => {
    if (ui.tabValue === 'in_progress') return buckets.inProgress;
    if (ui.tabValue === 'completed') return buckets.completed;
    return buckets.available;
  }
);

// Selects rooms page ui.
export const selectRoomsPageUi = (state: RootState) => state.pagesUi.rooms;

// Selects teacher portal ui.
export const selectTeacherPortalUi = (state: RootState) => state.pagesUi.teacherPortal;
export { selectOwnerManagerUi } from '../../features/owner/selectors';
