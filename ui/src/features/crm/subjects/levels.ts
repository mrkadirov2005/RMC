// Subject -> level -> group. A level carries the price for all its groups.
import { apiClient } from '@/shared/api/api';
import type { PriceHistoryEntry } from '@/features/crm/payments/priceHistory';

export interface LevelGroup {
  class_id: number;
  class_name: string;
  teacher_name: string | null;
  payment_amount: number | null;
  /** YYYY-MM: the month the group joined the level. */
  since: string | null;
  students: number | null;
}

export interface SubjectLevel {
  level_id: number;
  subject_id: number;
  level_name: string;
  sort_order: number;
  /** The price this month; null until the developer sets one. */
  payment_amount: number | null;
  groups: LevelGroup[];
}

export interface SubjectLevels {
  subject: { subject_id: number; subject_name: string };
  levels: SubjectLevel[];
  /** The subject's groups that are in no level yet (they keep their own price). */
  unleveled_groups: LevelGroup[];
}

export interface LevelHistory {
  level_id: number;
  level_name: string;
  subject_name: string | null;
  payment_amount: number | null;
  items: PriceHistoryEntry[];
}

export const levelsAPI = {
  forSubject: (subjectId: number) =>
    apiClient.get<SubjectLevels>(`/subjects/${subjectId}/levels`, { params: { _fresh: Date.now() } }),
  create: (subjectId: number, data: { level_name: string; payment_amount?: number }) =>
    apiClient.post(`/subjects/${subjectId}/levels`, data),
  update: (levelId: number, data: { level_name?: string; sort_order?: number }) => apiClient.put(`/levels/${levelId}`, data),
  remove: (levelId: number) => apiClient.delete(`/levels/${levelId}`),
  history: (levelId: number) =>
    apiClient.get<LevelHistory>(`/levels/${levelId}/price-history`, { params: { _fresh: Date.now() } }),
  changePrice: (levelId: number, data: { amount: number; effective_month?: string; note?: string }) =>
    apiClient.post(`/levels/${levelId}/price-changes`, data),
  /** Puts a group in a level (or out of any: null) from a month. */
  setClassLevel: (classId: number, data: { level_id: number | null; effective_month?: string }) =>
    apiClient.put(`/classes/${classId}/level`, data),
};
