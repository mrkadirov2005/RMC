import { describe, expect, it } from 'vitest';
import { getPaymentMonths, recentMonthKeys } from '../paymentMonths';

describe('group payment circles', () => {
  it('lists the current month and the two before it, oldest first, across a year change', () => {
    expect(recentMonthKeys(3, new Date('2026-11-15T08:00:00Z'))).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(recentMonthKeys(3, new Date('2027-01-10T08:00:00Z'))).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  const months = ['2026-09', '2026-10', '2026-11'];
  const pay = (date: string, amount: number, extra: Record<string, unknown> = {}) => ({ payment_date: date, amount, status: 'Completed', ...extra });

  it('marks each month full, partial or none by the payments dated in it', () => {
    const result = getPaymentMonths({}, 480000, [pay('2026-09-05', 480000), pay('2026-10-03', 200000)], months);
    expect(result.map((m) => m.state)).toEqual(['full', 'partial', 'none']);
    expect(result[1]).toMatchObject({ paid: 200000, expected: 480000 });
  });

  it('ignores payments that are not completed', () => {
    const result = getPaymentMonths({}, 480000, [pay('2026-11-01', 480000, { status: 'Pending' })], months);
    expect(result[2].state).toBe('none');
  });

  it('counts a discount on the payment towards the fee', () => {
    const result = getPaymentMonths({}, 480000, [pay('2026-11-02', 240000, { discount_amount: 240000 })], months);
    expect(result[2].state).toBe('full');
  });

  it('shows months before the start date as outside the group, and prorates the first month', () => {
    const result = getPaymentMonths({ start_date: '2026-10-16' }, 310000, [pay('2026-10-20', 160000)], months);
    expect(result[0].state).toBe('outside');
    // 16 of 31 days of October: 160,000 is the whole share.
    expect(result[1].state).toBe('full');
    expect(result[2].state).toBe('none');
  });
});
