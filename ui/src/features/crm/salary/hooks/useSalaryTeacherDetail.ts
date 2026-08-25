// Orchestrates data fetching for a single teacher's salary history.

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import {
  fetchTeacherSalaryDetail,
  selectSalaryTeacherDetail,
  selectSalaryTeacherDetailLoading,
} from '@/slices/salariesSlice';

export const useSalaryTeacherDetail = (teacherId: number | null | undefined, months = 6) => {
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectSalaryTeacherDetail);
  const loading = useAppSelector(selectSalaryTeacherDetailLoading);

  useEffect(() => {
    if (!teacherId) return;
    dispatch(fetchTeacherSalaryDetail({ teacherId, months }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, teacherId]);

  const refresh = () => {
    if (!teacherId) return;
    dispatch(fetchTeacherSalaryDetail({ teacherId, months }));
  };

  return { detail, loading, refresh };
};
