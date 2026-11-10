// A group's price over time, from GET /classes/:id/price-history. Each month is billed at the
// price in effect for it, so a raise doesn't make months paid at the old price look part paid.
import { apiClient } from '@/shared/api/api';
import { priceFromEntries } from '@/shared/groupPrices';

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
};

/** The price for a month (YYYY-MM): the latest entry starting on or before it; before the first
 * change, the price it replaced; else `fallback` (the group's price when it has no history).
 * Items come newest first. */
export const priceForMonth = (items: PriceHistoryEntry[] | undefined, monthKey: string, fallback: number) =>
  priceFromEntries(items, monthKey, fallback);
