// Every group's price over time, loaded once from GET /classes/price-histories and shared by all
// pages that work out what a student owed in a month. A month is billed at the price in effect
// for it, so raising a group's price doesn't make months paid at the old price look part paid.
import { useEffect, useSyncExternalStore } from 'react';
import { apiClient } from '@/shared/api/api';

type Entry = { amount: number; previous_amount?: number | null; effective_from: string };

const MAX_AGE_MS = 30 * 1000;

let prices: Record<string, Entry[]> = {};
// Each group's lesson days (e.g. ["Monday", "Wednesday", "Friday"]), for months billed by lessons.
let schedules: Record<string, string[]> = {};
let loadedAt = 0;
let pending: Promise<void> | null = null;
let version = 0;
const listeners = new Set<() => void>();

const notify = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

/** Loads the price histories (again when older than 30 seconds, or when `force`). */
export const loadGroupPrices = (force = false): Promise<void> => {
  if (pending) return pending;
  if (!force && loadedAt && Date.now() - loadedAt < MAX_AGE_MS) return Promise.resolve();
  pending = apiClient
    .get('/classes/price-histories', { params: { _fresh: Date.now() } })
    .then((response: any) => {
      prices = response?.data?.classes || {};
      schedules = response?.data?.schedules || {};
      loadedAt = Date.now();
      notify();
    })
    .catch(() => {
      // Without the histories every month falls back to the group's current price, as before.
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

/** After a price change: load again so every page shows the new price. */
export const refreshGroupPrices = () => loadGroupPrices(true);

/**
 * The group's price for a month (YYYY-MM): the latest price starting on or before it; a month
 * before the first change uses the price that change replaced. A group whose price never changed
 * (or before the histories have loaded) uses `fallback`, the group's current price.
 */
export const groupPriceFor = (classId: unknown, monthKey: string, fallback: unknown) =>
  priceFromEntries(prices[String(Number(classId) || '')], monthKey, Number(fallback || 0));

/** Entries come newest first. */
export const priceFromEntries = (items: Entry[] | undefined, monthKey: string, fallback: number) => {
  const list = items || [];
  const entry = list.find((item) => item.effective_from <= monthKey);
  if (entry) return Number(entry.amount);
  const earliest = list[list.length - 1];
  if (earliest && earliest.previous_amount != null) return Number(earliest.previous_amount);
  return fallback;
};

/** The group's lesson days from its schedule ([] when unknown or not loaded yet). */
export const groupLessonDaysFor = (classId: unknown): string[] => schedules[String(Number(classId) || '')] || [];

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Loads the price histories and re-renders when they arrive. Returns a number that changes with
 * every load: put it in the dependencies of memos that call groupPriceFor.
 */
export const useGroupPrices = () => {
  const current = useSyncExternalStore(subscribe, () => version, () => version);
  useEffect(() => {
    void loadGroupPrices();
  }, []);
  return current;
};

/** For tests: replace the loaded histories. */
export const setGroupPricesForTest = (next: Record<string, Entry[]>, nextSchedules: Record<string, string[]> = {}) => {
  prices = next;
  schedules = nextSchedules;
  loadedAt = Date.now();
  notify();
};
