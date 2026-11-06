import { describe, expect, it } from 'vitest';
import { priceForMonth, type PriceHistoryEntry } from '../priceHistory';

const entry = (effective_from: string, amount: number, history_id: number): PriceHistoryEntry => ({
  history_id, amount, effective_from, previous_amount: null, note: null, source: 'manual', changed_by_name: null, created_at: '',
});

// Newest first, as the API sends them.
const items = [entry('2026-12', 400000, 3), entry('2026-11', 350000, 2), entry('2000-01', 300000, 1)];

describe('priceForMonth', () => {
  it('bills each month at the price in effect for it', () => {
    expect(priceForMonth(items, '2026-08', 999)).toBe(300000);
    expect(priceForMonth(items, '2026-10', 999)).toBe(300000);
    expect(priceForMonth(items, '2026-11', 999)).toBe(350000);
    expect(priceForMonth(items, '2027-03', 999)).toBe(400000);
  });

  it("uses the group's price when it has no history", () => {
    expect(priceForMonth([], '2026-11', 480000)).toBe(480000);
    expect(priceForMonth(undefined, '2026-11', 480000)).toBe(480000);
  });
});
