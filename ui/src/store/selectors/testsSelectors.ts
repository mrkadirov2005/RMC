// Redux selectors for derived application state.

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type TestsTab = 'all' | 'active' | 'inactive';

// Selects tests items.
export const selectTestsItems = (state: RootState) => state.tests.items as any[];
// Selects tests loading.
export const selectTestsLoading = (state: RootState) => state.tests.loading;
// Selects tests error.
export const selectTestsError = (state: RootState) => state.tests.error;
// Selects assigned tests items.
export const selectAssignedTestsItems = (state: RootState) => state.tests.assignedItems as any[];
// Selects assigned tests loading.
export const selectAssignedTestsLoading = (state: RootState) => state.tests.assignedLoading;
// Selects assigned tests error.
export const selectAssignedTestsError = (state: RootState) => state.tests.assignedError;
// Selects submission details item.
export const selectSubmissionDetailsItem = (state: RootState) => state.tests.submissionDetails;
// Selects submission details loading.
export const selectSubmissionDetailsLoading = (state: RootState) => state.tests.submissionDetailsLoading;
// Selects submission details error.
export const selectSubmissionDetailsError = (state: RootState) => state.tests.submissionDetailsError;

export const selectTestsStats = createSelector([selectTestsItems], (tests) => {
  const active = tests.filter((test) => Boolean(test?.is_active)).length;
  const inactive = tests.length - active;
  const totalSubmissions = tests.reduce((sum, test) => sum + Number(test?.submission_count || 0), 0);

  return {
    total: tests.length,
    active,
    inactive,
    totalSubmissions,
  };
});

// Handles make select filtered tests.
export const makeSelectFilteredTests = () =>
  createSelector(
    [
      selectTestsItems,
      (_: RootState, searchTerm: string) => searchTerm,
      (_: RootState, _searchTerm: string, filterType: string) => filterType,
      (_: RootState, _searchTerm: string, _filterType: string, tab: TestsTab) => tab,
    ],
    (tests, searchTerm, filterType, tab) => {
      const normalizedSearch = searchTerm.trim().toLowerCase();

      return tests.filter((test) => {
        const name = String(test?.test_name || '').toLowerCase();
        const description = String(test?.description || '').toLowerCase();
        const type = String(test?.test_type || '');

        const matchesSearch =
          normalizedSearch.length === 0 || name.includes(normalizedSearch) || description.includes(normalizedSearch);
        const matchesType = filterType === 'all' || type === filterType;
        const matchesTab =
          tab === 'all' ||
          (tab === 'active' && Boolean(test?.is_active)) ||
          (tab === 'inactive' && !Boolean(test?.is_active));

        return matchesSearch && matchesType && matchesTab;
      });
    }
  );

export const selectAssignedTestsBuckets = createSelector([selectAssignedTestsItems], (tests) => {
  const available = tests.filter(
    (test) => !test?.submission_status || String(test.submission_status) === 'not_started'
  );
  const inProgress = tests.filter((test) => String(test?.submission_status) === 'in_progress');
  const completed = tests.filter((test) =>
    ['submitted', 'graded'].includes(String(test?.submission_status))
  );

  return {
    available,
    inProgress,
    completed,
  };
});
