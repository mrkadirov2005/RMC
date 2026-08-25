// Pure business rules for the teacher salary tracking feature.

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface SalaryPeriod {
  year: number;
  month: number;
}

// Returns the previous calendar month relative to `reference`, rolling the year at January.
export const resolvePreviousMonth = (reference: Date = new Date()): SalaryPeriod => {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1; // 1-12
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
};

export const formatSalaryPeriod = (year: number, month: number): string => {
  const name = MONTH_NAMES[month - 1] || String(month);
  return `${name} ${year}`;
};

// Formats a period for an <input type="month"> value, e.g. "2026-07".
export const monthInputValue = (year: number, month: number): string => {
  return `${year}-${String(month).padStart(2, '0')}`;
};

export const parseMonthInputValue = (value: string): SalaryPeriod | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return { year, month };
};

export const teacherFullName = (row: { first_name?: string | null; last_name?: string | null }): string => {
  return [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || 'Unknown Teacher';
};

export const formatStudentPaidShare = (stats: { total_students: number; paid_students: number; paid_percent: number }): string => {
  return `${stats.paid_students}/${stats.total_students} (${Math.round(stats.paid_percent)}%)`;
};
