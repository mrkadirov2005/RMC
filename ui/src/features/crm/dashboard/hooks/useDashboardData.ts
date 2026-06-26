// React hooks for the crm feature.

import { useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { fetchStudents, fetchStudentsForce } from '../../../../slices/studentsSlice';
import { fetchClasses, fetchClassesForce } from '../../../../slices/classesSlice';
import { fetchTeachers, fetchTeachersForce } from '../../../../slices/teachersSlice';
import { fetchPayments, fetchPaymentsForce } from '../../../../slices/paymentsSlice';
import { fetchDebts, fetchDebtsForce } from '../../../../slices/debtsSlice';
import {
  selectDashboardCollections,
  selectDashboardLoadingByRole,
} from '../../../../store/selectors';
import type {
  DashboardCollections,
  DashboardFinancialMonth,
  DashboardRole,
  DashboardScope,
  DashboardScopeOptions,
  DashboardSchoolSlice,
  DashboardStatCard,
  DashboardStats,
  DashboardStudentGrowthPoint,
} from '../types';
import {
  buildDashboardFinancialMonth,
  buildDashboardScopeOptions,
  buildDashboardSchoolDistribution,
  buildDashboardStats,
  buildDashboardStudentGrowth,
  filterDashboardCollections,
  getDashboardStatCards,
} from '../queries/dashboardQueries';

interface UseDashboardDataResult {
  loading: boolean;
  scopeOptions: DashboardScopeOptions;
  scopedCollections: DashboardCollections;
  stats: DashboardStats;
  statCards: DashboardStatCard[];
  finance: DashboardFinancialMonth;
  schoolDistribution: DashboardSchoolSlice[];
  studentGrowth: DashboardStudentGrowthPoint[];
}

// Provides dashboard data.
export const useDashboardData = (
  role: DashboardRole,
  selectedMonth: Date,
  scope: DashboardScope
): UseDashboardDataResult => {
  const dispatch = useAppDispatch();

  const isSuperuser = role === 'superuser';
  const collections = useAppSelector(selectDashboardCollections) as DashboardCollections;
  const loading = useAppSelector((state) => selectDashboardLoadingByRole(state, isSuperuser));

// Runs side effects for this component.
  useEffect(() => {
    dispatch(fetchStudents());
    dispatch(fetchClasses());
    if (isSuperuser) {
      dispatch(fetchTeachers());
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
      if (isSuperuser) {
        dispatch(fetchTeachersForce());
        dispatch(fetchPaymentsForce());
        dispatch(fetchDebtsForce());
      }
    };
    window.addEventListener('active-center-changed', handleActiveCenterChanged);
    return () => window.removeEventListener('active-center-changed', handleActiveCenterChanged);
  }, [dispatch, isSuperuser]);

  const scopeOptions = useMemo<DashboardScopeOptions>(
    () => buildDashboardScopeOptions(collections),
    [collections]
  );

  const scopedCollections = useMemo<DashboardCollections>(
    () => filterDashboardCollections(collections, scope),
    [collections, scope]
  );

  const stats = useMemo<DashboardStats>(
    () => buildDashboardStats(scopedCollections, isSuperuser, selectedMonth),
    [scopedCollections, isSuperuser, selectedMonth]
  );

  const finance = useMemo<DashboardFinancialMonth>(
    () => buildDashboardFinancialMonth(scopedCollections, selectedMonth),
    [scopedCollections, selectedMonth]
  );

  const schoolDistribution = useMemo<DashboardSchoolSlice[]>(
    () => buildDashboardSchoolDistribution(scopedCollections),
    [scopedCollections]
  );

  const studentGrowth = useMemo<DashboardStudentGrowthPoint[]>(
    () => buildDashboardStudentGrowth(scopedCollections),
    [scopedCollections]
  );

// Memoizes the stat cards derived value.
  const statCards = useMemo(() => getDashboardStatCards(stats, isSuperuser), [isSuperuser, stats]);

  return {
    loading,
    scopeOptions,
    scopedCollections,
    stats,
    statCards,
    finance,
    schoolDistribution,
    studentGrowth,
  };
};
