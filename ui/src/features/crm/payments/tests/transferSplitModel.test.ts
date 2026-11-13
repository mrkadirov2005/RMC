import { describe, expect, it } from 'vitest';
import { amountToFill, daysInMonthText, dueBreakdown, partFor } from '../transfer/transferSplitModel';

const group = (over: Record<string, unknown>) => ({
  student_id: 1, class_name: 'A1', teacher_name: 'Ali', start_date: null, end_date: null, lessons: 6,
  expected: 0, paid: 0, current: false, split_amount: null, ...over,
});

describe('transfer split notice', () => {
  it('shows the days of the month the student was in each group', () => {
    expect(daysInMonthText('2026-10', { start_date: '2026-09-01', end_date: '2026-10-15' })).toBe('1–15');
    expect(daysInMonthText('2026-10', { start_date: '2026-10-16', end_date: null })).toBe('16–31');
    expect(daysInMonthText('2026-02', { start_date: '2026-02-10', end_date: null })).toBe('10–28');
  });

  it('gives the old group its split and this group what is left', () => {
    const preview = { owed_total: 300000, months: [], split_total: 125000, kept_amount: 175000 };
    expect(partFor(group({ split_amount: 125000 }), preview)).toBe(125000);
    expect(partFor(group({ current: true }), preview)).toBe(175000);
  });

  it('shows the month at each group\'s own price and fills in what is still owed', () => {
    // 6 lessons in a 300 000 group, 7 in a 400 000 group.
    const groups = [group({ expected: 150000 }), group({ expected: 233333.33, current: true })];
    expect(dueBreakdown(groups)).toBe(`${(150000).toLocaleString()} + ${(233333).toLocaleString()}`);
    expect(amountToFill({ owed_total: 383333.33, months: [], split_total: 0, kept_amount: 0 })).toBe(383333);
    expect(amountToFill({ owed_total: 0, months: [], split_total: 0, kept_amount: 0 })).toBeNull();
    expect(amountToFill(null)).toBeNull();
  });
});
