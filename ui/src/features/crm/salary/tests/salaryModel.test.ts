import { describe, expect, it } from 'vitest';
import {
  collectedPercent,
  payoutParts,
  payoutProgress,
  payoutStatus,
  progressTone,
  receivedSoFar,
  formatSalaryPeriod,
  formatStudentPaidShare,
  monthInputValue,
  parseMonthInputValue,
  remainingAfterAdvances,
  resolvePreviousMonth,
  resolveSalaryStatus,
  teacherFullName,
} from '../model/salaryModel';

describe('resolvePreviousMonth', () => {
  it('returns the prior month within the same year', () => {
    expect(resolvePreviousMonth(new Date(2026, 7, 15))).toEqual({ year: 2026, month: 7 });
  });

  it('rolls back to December of the previous year when reference is January', () => {
    expect(resolvePreviousMonth(new Date(2026, 0, 5))).toEqual({ year: 2025, month: 12 });
  });
});

describe('formatSalaryPeriod', () => {
  it('formats a year/month pair as a readable label', () => {
    expect(formatSalaryPeriod(2026, 7)).toBe('July 2026');
    expect(formatSalaryPeriod(2025, 12)).toBe('December 2025');
  });
});

describe('month input helpers', () => {
  it('formats and parses <input type="month"> values symmetrically', () => {
    expect(monthInputValue(2026, 7)).toBe('2026-07');
    expect(parseMonthInputValue('2026-07')).toEqual({ year: 2026, month: 7 });
  });

  it('returns null for invalid input values', () => {
    expect(parseMonthInputValue('not-a-month')).toBeNull();
    expect(parseMonthInputValue('2026-13')).toBeNull();
  });
});

describe('teacherFullName', () => {
  it('joins first and last name', () => {
    expect(teacherFullName({ first_name: 'Jane', last_name: 'Doe' })).toBe('Jane Doe');
  });

  it('falls back when names are missing', () => {
    expect(teacherFullName({})).toBe('Unknown Teacher');
  });
});

describe('formatStudentPaidShare', () => {
  it('renders paid/total with rounded percent', () => {
    expect(formatStudentPaidShare({ total_students: 20, paid_students: 15, paid_percent: 75 })).toBe('15/20 (75%)');
  });
});

describe('resolveSalaryStatus', () => {
  it('is paid once the salary is marked paid, advance or not', () => {
    expect(resolveSalaryStatus({ is_paid: true }, 300000)).toBe('paid');
  });

  it('is pending when an advance was given and the salary is not paid out yet', () => {
    expect(resolveSalaryStatus(null, 300000)).toBe('pending');
    expect(resolveSalaryStatus({ is_paid: false }, '150000')).toBe('pending');
  });

  it('is unpaid with no advance and no payment', () => {
    expect(resolveSalaryStatus(null, 0)).toBe('unpaid');
    expect(resolveSalaryStatus({ is_paid: false }, undefined)).toBe('unpaid');
  });
});

describe('remainingAfterAdvances', () => {
  it('takes the advances off the salary and never goes below zero', () => {
    expect(remainingAfterAdvances(1000000, 300000)).toBe(700000);
    expect(remainingAfterAdvances('500000', '600000')).toBe(0);
    expect(remainingAfterAdvances(null, 100)).toBe(0);
  });
});

describe('salary list figures', () => {
  it('the share of student payments that came in, capped at 100', () => {
    expect(collectedPercent({ expected: 10000, collected: 5000 })).toBe(50);
    expect(collectedPercent({ expected: 10000, collected: 12000 })).toBe(100);
    expect(collectedPercent({ expected: 0, collected: 0 })).toBe(0);
    expect(collectedPercent(null)).toBe(0);
  });

  it('green from 90%, amber from 50%, red below', () => {
    expect(progressTone(95).text).toBe('text-emerald-600');
    expect(progressTone(50).text).toBe('text-amber-600');
    expect(progressTone(49).text).toBe('text-rose-600');
  });

  it('what the teacher received: the advances, and the whole salary once it is paid', () => {
    expect(receivedSoFar(null, 200000)).toBe(200000);
    expect(receivedSoFar({ is_paid: false, amount: 1000000 }, 200000)).toBe(200000);
    expect(receivedSoFar({ is_paid: true, amount: 1000000 }, 200000)).toBe(1000000);
    expect(receivedSoFar({ is_paid: true, amount: '1000000' }, 0)).toBe(1000000);
  });
});

describe('payout of the salary by pay rate', () => {
  it('splits what was received into advances and the salary paid on top of them', () => {
    expect(payoutParts(null, 300000)).toEqual({ advances: 300000, paidOut: 0 });
    expect(payoutParts({ is_paid: true, amount: '1000000' }, 300000)).toEqual({ advances: 300000, paidOut: 700000 });
  });

  it('counts the salary given in parts, without counting it twice in the record that follows it', () => {
    expect(payoutParts({ is_paid: false, amount: '500000' }, 300000, 200000)).toEqual({ advances: 300000, paidOut: 200000 });
    expect(payoutParts({ is_paid: true, amount: '775000' }, 300000, 475000)).toEqual({ advances: 300000, paidOut: 475000 });
  });

  it('shows how much of the salary came and what is left', () => {
    expect(payoutProgress(300000, 1000000)).toEqual({ percent: 30, left: 700000, over: 0 });
    expect(payoutProgress(1200000, 1000000)).toEqual({ percent: 100, left: 0, over: 200000 });
    expect(payoutProgress(0, 0)).toEqual({ percent: 0, left: 0, over: 0 });
  });

  it('is paid once all of it came, pending while part of it did', () => {
    expect(payoutStatus(1000000, 1000000)).toBe('paid');
    expect(payoutStatus(300000, 1000000)).toBe('pending');
    expect(payoutStatus(0, 1000000)).toBe('unpaid');
    expect(payoutStatus(0, 0)).toBe('unpaid');
  });
});
