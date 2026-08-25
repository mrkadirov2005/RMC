// Orchestrates data + UI state for the Salary listing page.

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchSalaryOverview,
  selectSalaryOverview,
  selectSalaryOverviewLoading,
} from '@/slices/salariesSlice';
import { paginateItems, defaultPageSizeOptions } from '@/components/common/PaginationBar';
import { resolvePreviousMonth, teacherFullName } from '../model/salaryModel';
import type { SalaryOverviewRow } from '../types';

export const useSalaryOverview = () => {
  const dispatch = useAppDispatch();
  const overview = useAppSelector(selectSalaryOverview);
  const loading = useAppSelector(selectSalaryOverviewLoading);

  const defaultPeriod = useMemo(() => resolvePreviousMonth(), []);
  const [year, setYear] = useState(defaultPeriod.year);
  const [month, setMonth] = useState(defaultPeriod.month);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSizeOptions[0]);

  useEffect(() => {
    dispatch(fetchSalaryOverview({ year, month }));
  }, [dispatch, year, month]);

  useEffect(() => {
    setPage(1);
  }, [search, year, month]);

  const setPeriod = (nextYear: number, nextMonth: number) => {
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const refresh = () => {
    dispatch(fetchSalaryOverview({ year, month }));
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return overview;
    return overview.filter((row: SalaryOverviewRow) => teacherFullName(row).toLowerCase().includes(query));
  }, [overview, search]);

  const { items: pagedRows, currentPage, totalPages, start, end } = paginateItems(filteredRows, page, pageSize);

  const summary = useMemo(() => {
    const teacherCount = overview.length;
    const paidCount = overview.filter((row) => row.salary?.is_paid).length;
    const unpaidCount = teacherCount - paidCount;
    const avgPaidPercent = teacherCount
      ? Math.round(overview.reduce((sum, row) => sum + (row.student_stats?.paid_percent ?? 0), 0) / teacherCount)
      : 0;
    return { teacherCount, paidCount, unpaidCount, avgPaidPercent };
  }, [overview]);

  return {
    year,
    month,
    setPeriod,
    search,
    setSearch,
    loading,
    rows: pagedRows,
    totalRows: filteredRows.length,
    page,
    setPage,
    pageSize,
    setPageSize,
    currentPage,
    totalPages,
    start,
    end,
    summary,
    refresh,
  };
};
