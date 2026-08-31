// Orchestrates data + UI state for the Teachers page KPI tab.

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import {
  fetchKpiOverview,
  selectKpiOverview,
  selectKpiOverviewLoading,
} from '@/slices/kpisSlice';
import { resolveCurrentMonth, teacherFullName } from '../model/kpiModel';
import type { KpiOverviewRow } from '../types';

export const useTeacherKpiOverview = () => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector(selectKpiOverview);
  const loading = useAppSelector(selectKpiOverviewLoading);

  const defaultPeriod = useMemo(() => resolveCurrentMonth(), []);
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [search, setSearch] = useState('');

  useEffect(() => {
    dispatch(fetchKpiOverview({ year, month }));
  }, [dispatch, year, month]);

  const setPeriod = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return overview;
    return overview.filter((row: KpiOverviewRow) => teacherFullName(row).toLowerCase().includes(query));
  }, [overview, search]);

  return { year, month, setPeriod, search, setSearch, loading, rows };
};
