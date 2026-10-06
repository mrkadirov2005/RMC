import { useEffect, useState } from 'react';
import { getCenterMonthKey } from '@/shared/billingPeriod';
import { salaryAPI } from '../api';
import type { TeacherGroupPayments } from './types';

type LoadState = { month: string; data: TeacherGroupPayments | null; failed: boolean };

/** The signed-in teacher's per-group payments for a month (YYYY-MM), refetched when the month changes. */
export const useMyGroupPayments = (month: string = getCenterMonthKey()) => {
  const [state, setState] = useState<LoadState | null>(null);

  useEffect(() => {
    let cancelled = false;
    salaryAPI
      .getMyPayments({ month })
      .then((response) => {
        if (!cancelled) setState({ month, data: response?.data ?? null, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ month, data: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const current = state?.month === month ? state : null;
  return { data: current?.data ?? null, loading: current === null, failed: current?.failed ?? false };
};
