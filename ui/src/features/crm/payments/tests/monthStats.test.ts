import { describe, expect, it } from 'vitest';
import { paymentMonthStats, salaryPaidStats } from '../monthStats';

describe('payment month statistics', () => {
  it('shows what should come in, what came in and the shares', () => {
    expect(paymentMonthStats({ students: 200, paid_students: 150, partial_students: 20, unpaid_students: 30, collected: 45_000_000, remaining: 15_000_000 }))
      .toMatchObject({ expected: 60_000_000, collected: 45_000_000, remaining: 15_000_000, collectedPercent: 75, unpaidPercent: 25, paidStudentsPercent: 75 });
  });

  it('is all zero for an empty month', () => {
    expect(paymentMonthStats(null)).toMatchObject({ expected: 0, collectedPercent: 0, unpaidPercent: 0, paidStudentsPercent: 0 });
  });

  it('counts teachers whose salary is marked paid', () => {
    expect(salaryPaidStats([{ salary: { is_paid: true } }, { salary: { is_paid: false } }, { salary: null }, { salary: { is_paid: true } }]))
      .toEqual({ teachers: 4, paid: 2, waiting: 2, paidPercent: 50, waitingPercent: 50 });
    expect(salaryPaidStats([])).toEqual({ teachers: 0, paid: 0, waiting: 0, paidPercent: 0, waitingPercent: 0 });
  });
});
