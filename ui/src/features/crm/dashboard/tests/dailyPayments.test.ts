import { describe, expect, it } from 'vitest';
import { buildPaymentDays, centerDayKey, previousCenterDayKey } from '../dailyPayments';

// 16 October 2026, 23:30 in Tashkent (18:30 UTC).
const now = new Date('2026-10-16T18:30:00Z');

describe('daily payments chart', () => {
  it('adds up the money collected on each day of the month', () => {
    const days = buildPaymentDays([
      { payment_date: '2026-10-16', amount: '320000.00', payment_status: 'Completed' },
      { payment_date: '2026-10-16', amount: 150000, payment_status: 'Completed' },
      { payment_date: '2026-10-01', amount: 300000, status: 'Paid' },
      { payment_date: '2026-10-31', amount: 200000, payment_status: 'Completed' },
    ], now);
    expect(days).toHaveLength(31);
    expect(days[15]).toEqual({ key: '2026-10-16', label: '16', amount: 470000, count: 2 });
    expect(days[0]).toMatchObject({ key: '2026-10-01', label: '1', amount: 300000, count: 1 });
    // The last day of the month gets its own bar.
    expect(days[30]).toMatchObject({ key: '2026-10-31', label: '31', amount: 200000 });
  });

  it('leaves out unfinished payments, transfers between groups and other months', () => {
    const days = buildPaymentDays([
      { payment_date: '2026-10-05', amount: 100000, payment_status: 'Pending' },
      { payment_date: '2026-10-05', amount: -80000, payment_status: 'Completed', payment_type: 'Transfer Adjustment' },
      { payment_date: '2026-10-05', amount: 80000, payment_status: 'Completed', payment_type: 'Transfer Adjustment' },
      { payment_date: '2026-09-30', amount: 100000, payment_status: 'Completed' },
    ], now);
    expect(days.reduce((sum, day) => sum + day.amount + day.count, 0)).toBe(0);
  });

  it('uses the Tashkent date, so late evening still counts as today', () => {
    expect(centerDayKey(now)).toBe('2026-10-16');
    expect(previousCenterDayKey(now)).toBe('2026-10-15');
    expect(previousCenterDayKey(new Date('2026-10-01T03:00:00Z'))).toBe('2026-09-30');
  });
});
