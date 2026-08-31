// Orchestrates data fetching for a single teacher's KPI history.

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks';
import {
  fetchTeacherKpiDetail,
  selectKpiTeacherDetail,
  selectKpiTeacherDetailLoading,
} from '@/slices/kpisSlice';

export const useTeacherKpiDetail = (teacherId: number | null | undefined) => {
  const dispatch = useAppDispatch();
  const detail = useAppSelector(selectKpiTeacherDetail);
  const loading = useAppSelector(selectKpiTeacherDetailLoading);

  useEffect(() => {
    if (!teacherId) return;
    dispatch(fetchTeacherKpiDetail({ teacherId }));
  }, [dispatch, teacherId]);

  const refresh = () => {
    if (!teacherId) return;
    dispatch(fetchTeacherKpiDetail({ teacherId }));
  };

  return { detail, loading, refresh };
};
