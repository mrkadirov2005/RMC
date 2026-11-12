import { describe, expect, it } from 'vitest';
import { daysInMonthText, partFor } from '../transfer/transferSplitModel';

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
    const preview = { months: [], split_total: 125000, kept_amount: 175000 };
    expect(partFor(group({ split_amount: 125000 }), preview)).toBe(125000);
    expect(partFor(group({ current: true }), preview)).toBe(175000);
  });
});
