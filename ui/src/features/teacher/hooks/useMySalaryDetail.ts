// Orchestrates fetching the logged-in teacher's own salary history.

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../crm/hooks';
import {
  fetchMySalaryDetail,
  selectMySalaryDetail,
  selectMySalaryDetailLoading,
} from '@/slices/salariesSlice';

export const useMySalaryDetail = (teacherId?: number | string | null, months = 12) => {
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectMySalaryDetail);
  const loading = useAppSelector(selectMySalaryDetailLoading);

  useEffect(() => {
    if (!teacherId) return;
    dispatch(fetchMySalaryDetail({ months }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, teacherId]);

  return { detail, loading };
};
