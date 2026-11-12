import { describe, expect, it } from 'vitest';
import { debtShortcuts, lastDayOfMonth, monthRange, shiftMonth } from '../debtMonths';

describe('debt months', () => {
  it('turns a month pair into the day range, swapping a reversed pair', () => {
    expect(monthRange('2026-09', '2026-10')).toEqual({ from: '2026-09-01', to: '2026-10-31' });
    expect(monthRange('2026-10', '2026-09')).toEqual({ from: '2026-09-01', to: '2026-10-31' });
    expect(lastDayOfMonth('2028-02')).toBe('2028-02-29');
  });

  it('moves across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-11', -6)).toBe('2026-05');
  });

  it('offers this month, last month and the six months before this one', () => {
    expect(debtShortcuts(new Date(2026, 10, 12)).map((item) => [item.id, item.from, item.to])).toEqual([
      ['this', '2026-11', '2026-11'],
      ['last', '2026-10', '2026-10'],
      ['earlier', '2026-05', '2026-10'],
    ]);
  });
});
