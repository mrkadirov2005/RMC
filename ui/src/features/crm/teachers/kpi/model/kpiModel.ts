// Pure business rules for the teacher KPI tracking feature.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface KpiPeriod {
  year: number;
  month: number;
}

export const resolveCurrentMonth = (reference: Date = new Date()): KpiPeriod => ({
  year: reference.getFullYear(),
  month: reference.getMonth() + 1,
});

export const formatKpiPeriod = (year: number, month: number): string => {
  const name = MONTH_NAMES[month - 1] || String(month);
  return `${name} ${year}`;
};

// Formats a period for an <input type="month"> value, e.g. "2026-07".
export const monthInputValue = (year: number, month: number): string =>
  `${year}-${String(month).padStart(2, '0')}`;

export const parseMonthInputValue = (value: string): KpiPeriod | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
};

export const teacherFullName = (row: { first_name?: string | null; last_name?: string | null }): string =>
  [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Unknown Teacher';

export const computeFinalScorePreview = (
  studentScore: number,
  retentionScore: number,
  contributionScore: number,
  teachingQualityScore: number
): number => Math.round(((studentScore + retentionScore + contributionScore + teachingQualityScore) / 4) * 100) / 100;

export const formatScore = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(1) : '—';
};
