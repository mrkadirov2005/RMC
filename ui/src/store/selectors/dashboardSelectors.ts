// Redux selectors for derived application state.

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export interface DashboardCollectionsSelectorResult {
  students: any[];
  teachers: any[];
  classes: any[];
  centers: any[];
  tests: any[];
  attendance: any[];
  assignments: any[];
  payments: any[];
  debts: any[];
}

export const selectDashboardCollections = createSelector(
  [
    (state: RootState) => state.students.items,
    (state: RootState) => state.teachers.items,
    (state: RootState) => state.classes.items,
    (state: RootState) => state.centers.items,
    (state: RootState) => state.tests.items,
    (state: RootState) => state.attendance.items,
    (state: RootState) => state.assignments.items,
    (state: RootState) => state.payments.items,
    (state: RootState) => state.debts.items,
  ],
  (
    students,
    teachers,
    classes,
    centers,
    tests,
    attendance,
    assignments,
    payments,
    debts
  ): DashboardCollectionsSelectorResult => ({
    students,
    teachers,
    classes,
    centers,
    tests,
    attendance,
    assignments,
    payments,
    debts,
  })
);

// Selects dashboard loading by role.
export const selectDashboardLoadingByRole = (state: RootState, isSuperuser: boolean) =>
  Boolean(
    state.students.loading ||
      state.classes.loading ||
      state.tests.loading ||
      state.attendance.loading ||
      state.assignments.loading ||
      (isSuperuser &&
        (state.teachers.loading || state.centers.loading || state.payments.loading || state.debts.loading))
  );
