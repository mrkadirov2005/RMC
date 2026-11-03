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

export type SalaryStatus = 'paid' | 'pending' | 'unpaid';

/** Paid once marked so; pending when an advance was given but the salary is not paid out yet. */
export const resolveSalaryStatus = (salary: { is_paid?: boolean } | null | undefined, advanceTotal?: number | string | null): SalaryStatus => {
  if (salary?.is_paid) return 'paid';
  return Number(advanceTotal) > 0 ? 'pending' : 'unpaid';
};

/** What is still owed after the advances; never negative. */
export const remainingAfterAdvances = (amount: number | string | null | undefined, advanceTotal: number | string | null | undefined): number => {
  const left = (Number(amount) || 0) - (Number(advanceTotal) || 0);
  return Math.max(0, Math.round(left * 100) / 100);
};

/** Share of the expected student payments that came in, 0-100 (over 100 counts as 100). */
export const collectedPercent = (progress?: { expected: number; collected: number } | null): number => {
  if (!progress || !(progress.expected > 0)) return 0;
  return Math.min(100, Math.round((progress.collected / progress.expected) * 100));
};

/** Colour of the student payment line: green from 90%, amber from 50%, red below. */
export const progressTone = (percent: number): { bar: string; text: string } =>
  percent >= 90
    ? { bar: '#10b981', text: 'text-emerald-600' }
    : percent >= 50
      ? { bar: '#f59e0b', text: 'text-amber-600' }
      : { bar: '#f43f5e', text: 'text-rose-600' };

/** What the teacher has actually received for the month: advances, plus the rest once the salary is paid. */
export const receivedSoFar = (salary: { is_paid?: boolean; amount?: number | string } | null | undefined, advanceTotal?: number | string | null): number => {
  const advances = Number(advanceTotal) || 0;
  if (!salary?.is_paid) return Math.round(advances * 100) / 100;
  return Math.round(Math.max(Number(salary.amount) || 0, advances) * 100) / 100;
};

/** How much of the month's salary (by pay rate) the teacher has received, and what is left. */
export const payoutProgress = (received: number, due: number): { percent: number; left: number; over: number } => {
  const round = (value: number) => Math.round(value * 100) / 100;
  return {
    percent: due > 0 ? Math.min(100, Math.round((received / due) * 100)) : received > 0 ? 100 : 0,
    left: round(Math.max(0, due - received)),
    over: round(Math.max(0, received - due)),
  };
};

/** "2026-10" as "October 2026". */
export const formatMonthKey = (key?: string | null): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
  return match ? formatSalaryPeriod(Number(match[1]), Number(match[2])) : '—';
};

/** A sum without the currency, for tight places: "1 250 000". */
export const formatAmount = (amount: number | string | null | undefined): string =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(amount) || 0);

/** The advances, and the salary paid out on top of them (a paid salary's amount includes its advances). */
export const payoutParts = (salary: { is_paid?: boolean; amount?: number | string } | null | undefined, advanceTotal?: number | string | null) => {
  const advances = Number(advanceTotal) || 0;
  const paidOut = salary?.is_paid ? Math.max(0, (Number(salary.amount) || 0) - advances) : 0;
  return { advances, paidOut: Math.round(paidOut * 100) / 100 };
};

/** Received of the month's salary: all of it (green), part (blue) or nothing yet (red). */
export const payoutStatus = (received: number, due: number): SalaryStatus =>
  received > 0 && received + 0.01 >= due ? 'paid' : received > 0 ? 'pending' : 'unpaid';
