// React hooks for the crm feature.

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchStudents, fetchStudentsForce } from '../../../../slices/studentsSlice';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchTests, fetchTestsForce } from '../../../../slices/testsSlice';
import { fetchAttendance, fetchAttendanceForce } from '../../../../slices/attendanceSlice';
import { fetchAssignments, fetchAssignmentsForce } from '../../../../slices/assignmentsSlice';
import { fetchTeachers, fetchTeachersForce } from '../../../../slices/teachersSlice';
import { fetchCenters, fetchCentersForce } from '../../../../slices/centersSlice';
import { fetchPayments, fetchPaymentsForce } from '../../../../slices/paymentsSlice';
import { fetchDebts, fetchDebtsForce } from '../../../../slices/debtsSlice';
import {
  selectDashboardCollections,
  selectDashboardLoadingByRole,
} from '../../../../store/selectors';
import type {
  DashboardActivityItem,
  DashboardCollections,
  DashboardFocusItem,
  DashboardRole,
  DashboardStatCard,
  DashboardStats,
} from '../types';
import {
  buildDashboardActivity,
  buildDashboardStats,
  getDashboardFocusItems,
  getDashboardStatCards,
} from '../queries/dashboardQueries';

interface UseDashboardDataResult {
  loading: boolean;
  stats: DashboardStats;
  recentActivity: DashboardActivityItem[];
  statCards: DashboardStatCard[];
  focusItems: DashboardFocusItem[];
}

// Provides dashboard data.
export const useDashboardData = (role: DashboardRole): UseDashboardDataResult => {
  const dispatch = useAppDispatch();

  const isSuperuser = role === 'superuser';
  const collections = useAppSelector(selectDashboardCollections) as DashboardCollections;
  const loading = useAppSelector((state) => selectDashboardLoadingByRole(state, isSuperuser));

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchClasses());
    dispatch(fetchTests());
    dispatch(fetchAttendance());
    dispatch(fetchAssignments());
    if (isSuperuser) {
      dispatch(fetchTeachers());
      dispatch(fetchCenters());
      dispatch(fetchPayments());
      dispatch(fetchDebts());
    }
  }, [dispatch, isSuperuser]);

// Runs side effects for this component.
  useEffect(() => {
// Handles active center changed.
    const handleActiveCenterChanged = () => {
      dispatch(fetchStudentsForce());
      dispatch(fetchClassesForce());
      dispatch(fetchTestsForce());
      dispatch(fetchAttendanceForce());
      dispatch(fetchAssignmentsForce());
      if (isSuperuser) {
        dispatch(fetchTeachersForce());
        dispatch(fetchCentersForce());
        dispatch(fetchPaymentsForce());
        dispatch(fetchDebtsForce());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isSuperuser]);

  const stats = useMemo<DashboardStats>(
    () => buildDashboardStats(collections, isSuperuser),
    [collections, isSuperuser]
  );

  const recentActivity = useMemo<DashboardActivityItem[]>(
    () => buildDashboardActivity(collections),
    [collections]
  );

// Memoizes the stat cards derived value.
  const statCards = useMemo(() => getDashboardStatCards(stats, isSuperuser), [isSuperuser, stats]);
// Memoizes the focus items derived value.
  const focusItems = useMemo(() => getDashboardFocusItems(stats, isSuperuser), [isSuperuser, stats]);

  return {
    loading,
    stats,
    recentActivity,
    statCards,
    focusItems,
  };
};

