import { describe, expect, it } from 'vitest';
import {
  computeFinalScorePreview,
  formatKpiPeriod,
  formatScore,
  monthInputValue,
  parseMonthInputValue,
  resolveCurrentMonth,
  teacherFullName,
} from '../kpiModel';

describe('resolveCurrentMonth', () => {
  it('returns the calendar month of the reference date', () => {
    expect(resolveCurrentMonth(new Date(2026, 7, 15))).toEqual({ year: 2026, month: 8 });
  });
});

describe('formatKpiPeriod', () => {
  it('formats a year/month pair as a readable label', () => {
    expect(formatKpiPeriod(2026, 8)).toBe('August 2026');
    expect(formatKpiPeriod(2025, 12)).toBe('December 2025');
  });
});

describe('month input helpers', () => {
  it('formats and parses <input type="month"> values symmetrically', () => {
    expect(monthInputValue(2026, 8)).toBe('2026-08');
    expect(parseMonthInputValue('2026-08')).toEqual({ year: 2026, month: 8 });
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

describe('computeFinalScorePreview', () => {
  const parts = { retentionScore: 90, studentScore: 80, contributionScore: 70, examScore: 85, teachingQualityScore: 95, gradingScore: 100, referralCount: 0 };

  it('averages the six 100-point parts, as the server does', () => {
    expect(computeFinalScorePreview(parts)).toBe(86.67);
  });

  it('adds 1 point for each new student who came for the teacher', () => {
    expect(computeFinalScorePreview({ ...parts, referralCount: 3 })).toBe(89.67);
  });
});

describe('formatScore', () => {
  it('renders a fixed one-decimal number', () => {
    expect(formatScore(85)).toBe('85.0');
    expect(formatScore('72.456')).toBe('72.5');
  });

  it('renders a dash for missing values', () => {
    expect(formatScore(null)).toBe('—');
    expect(formatScore(undefined)).toBe('—');
  });
});
