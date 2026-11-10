import { afterEach, describe, expect, it } from 'vitest';
import { groupPriceFor, setGroupPricesForTest } from '../groupPrices';
import { getPaymentMonths } from '@/features/crm/students/utils/paymentMonths';

// Group 7: 300 000 until October 2026, 350 000 from November (newest first, as the API sends).
const raised = { '7': [{ amount: 350000, effective_from: '2026-11' }, { amount: 300000, effective_from: '2000-01' }] };

afterEach(() => setGroupPricesForTest({}));

describe('groupPriceFor', () => {
  it("uses the price in effect for the month", () => {
    setGroupPricesForTest(raised);
    expect(groupPriceFor(7, '2026-09', 350000)).toBe(300000);
    expect(groupPriceFor(7, '2026-10', 350000)).toBe(300000);
    expect(groupPriceFor(7, '2026-11', 350000)).toBe(350000);
    expect(groupPriceFor('7', '2027-02', 350000)).toBe(350000);
  });

  it('uses the price a change replaced for months before it, even without an initial row', () => {
    setGroupPricesForTest({ '57': [{ amount: 320000, previous_amount: 300000, effective_from: '2026-11' }] });
    expect(groupPriceFor(57, '2026-10', 320000)).toBe(300000);
    expect(groupPriceFor(57, '2026-11', 320000)).toBe(320000);
  });

  it("falls back to the group's price when it was never changed", () => {
    setGroupPricesForTest(raised);
    expect(groupPriceFor(8, '2026-09', 480000)).toBe(480000);
    expect(groupPriceFor(null, '2026-09', 480000)).toBe(480000);
  });
});

describe('student payment months with a price change', () => {
  it('a month paid at the old price stays fully paid after a raise', () => {
    setGroupPricesForTest(raised);
    const record = { class_id: 7 };
    const payments = [
      { amount: 300000, payment_date: '2026-10-05', payment_status: 'Completed' },
      { amount: 300000, payment_date: '2026-11-05', payment_status: 'Completed' },
    ];
    const [october, november] = getPaymentMonths(record, 350000, payments, ['2026-10', '2026-11']);
    expect(october).toMatchObject({ state: 'full', expected: 300000 });
    expect(november).toMatchObject({ state: 'partial', expected: 350000 });
  });
});
