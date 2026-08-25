import { describe, expect, it } from 'vitest';
import {
  formatSalaryPeriod,
  formatStudentPaidShare,
  monthInputValue,
  parseMonthInputValue,
  resolvePreviousMonth,
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
