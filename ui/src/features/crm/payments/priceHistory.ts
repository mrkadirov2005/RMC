// A group's price over time, from GET /classes/:id/price-history. Each month is billed at the
// price in effect for it, so a raise doesn't make months paid at the old price look part paid.
import { useEffect, useState } from 'react';
import { apiClient } from '@/shared/api/api';
import { getApiPayload } from '@/shared/api/response';
import { useAppSelector } from '@/features/crm/hooks';

export interface PriceHistoryEntry {
  history_id: number;
  amount: number;
  previous_amount: number | null;
  /** YYYY-MM: the first month billed at this price. */
  effective_from: string;
  note: string | null;
  source: 'manual' | 'initial';
  changed_by_name: string | null;
  created_at: string;
}

export interface PriceHistory {
  class_id: number;
  current_amount: number;
  items: PriceHistoryEntry[];
}

export const priceHistoryAPI = {
  get: (classId: number) => apiClient.get<PriceHistory>(`/classes/${classId}/price-history`, { params: { _fresh: Date.now() } }),
  change: (classId: number, data: { amount: number; effective_month: string; note?: string }) =>
    apiClient.post(`/classes/${classId}/price-changes`, data),
  permission: () => apiClient.get<{ can_change: boolean }>('/classes/price-permission', { params: { _fresh: Date.now() } }),
};

/** Whether the signed-in user may change group prices. The developer always may; owners and
 * admins only while the developer allows it (Technical section → Permissions). The server checks
 * again on every change, so this only shows or hides the controls. */
export const useCanChangeGroupPrice = () => {
  const user = useAppSelector((state) => state.auth.user);
  const isDeveloper = user?.userType === 'superuser' && user?.is_developer === true;
  const isStaff = user?.userType === 'superuser';
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (isDeveloper || !isStaff) return;
    let cancelled = false;
    priceHistoryAPI
      .permission()
      .then((res) => {
        if (!cancelled) setAllowed(Boolean(getApiPayload<{ can_change: boolean }>(res)?.can_change));
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isDeveloper, isStaff]);

  return isDeveloper || (isStaff && allowed);
};

/** The price for a month (YYYY-MM): the latest entry starting on or before it, else `fallback`
 * (the group's price when it has no history). Items come newest first. */
export const priceForMonth = (items: PriceHistoryEntry[] | undefined, monthKey: string, fallback: number) => {
  const entry = (items || []).find((item) => item.effective_from <= monthKey);
  return entry ? Number(entry.amount) : fallback;
};
