// Shared bits of the cash report: the three tills, dates in the center's time zone.

export type MethodGroup = 'cash' | 'card' | 'bank' | 'other';
export type MethodTotals = Record<MethodGroup, number> & { total: number };

export type CashPayment = {
  payment_id: number;
  student_id: number | null;
  student_name: string | null;
  class_name: string | null;
  amount: number;
  payment_method: string;
  method_group: MethodGroup;
  /** The month the payment was for, YYYY-MM. */
  for_month?: string | null;
  received_by_name: string | null;
  paid_at: string | null;
};

export type CashExpense = {
  expense_id: number;
  expense_date: string;
  amount: number | string;
  payment_method: string;
  method_group?: MethodGroup;
  description: string;
  created_by_name: string | null;
};

export type DailyCashReport = {
  date: string;
  /** The day's own month, YYYY-MM. */
  month?: string;
  payments: CashPayment[];
  expenses: CashExpense[];
  income: MethodTotals;
  expenses_total: MethodTotals;
  remaining: MethodTotals;
};

export const METHOD_GROUPS: MethodGroup[] = ['cash', 'card', 'bank', 'other'];

/** Report labels, English keys translated by t(). */
export const METHOD_LABELS: Record<MethodGroup, string> = { cash: 'Cash', card: 'Card', bank: 'Bank account', other: 'Other' };

/** Methods an expense can be paid with, as the server stores them. */
export const EXPENSE_METHOD_OPTIONS = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Credit Card', label: 'Card' },
  { value: 'Bank Transfer', label: 'Bank account' },
];

const TIME_ZONE = 'Asia/Tashkent';

export const centerToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

/** "2026-10-09" moved by whole days, without time-zone drift. */
export const shiftDay = (date: string, by: number) => {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + by);
  return day.toISOString().slice(0, 10);
};

export const monthBounds = (date: string) => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${date.slice(0, 7)}-01`, to: `${date.slice(0, 7)}-${String(last).padStart(2, '0')}` };
};

/** Payment time as "13:51" in Tashkent. */
export const formatTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);
};

export const formatDay = (value: string) => `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;

export type MonthSection = {
  month: string;
  /** Paid for the day's own month. */
  current: boolean;
  total: number;
  methods: Array<{ group: MethodGroup; rows: CashPayment[]; total: number }>;
};

const sumAmounts = (rows: CashPayment[]) => Math.round(rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) * 100) / 100;

/**
 * The day's payments by the month they were for: the day's own month first, then the other months
 * (newest first); inside each, cash, card, bank, other, as the till counts them.
 */
export const paymentsByMonth = (payments: CashPayment[], dayMonth: string): MonthSection[] => {
  const months = Array.from(new Set(payments.map((row) => row.for_month || dayMonth)));
  months.sort((a, b) => (a === dayMonth ? -1 : b === dayMonth ? 1 : b.localeCompare(a)));
  return months.map((month) => {
    const rows = payments.filter((row) => (row.for_month || dayMonth) === month);
    return {
      month,
      current: month === dayMonth,
      total: sumAmounts(rows),
      methods: METHOD_GROUPS.map((group) => {
        const groupRows = rows.filter((row) => row.method_group === group);
        return { group, rows: groupRows, total: sumAmounts(groupRows) };
      }).filter((method) => method.rows.length > 0),
    };
  });
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "2026-10" as its English month name (for t()) and year. */
export const monthNameParts = (month: string) => ({ name: MONTH_NAMES[Number(month.slice(5, 7)) - 1] || month, year: month.slice(0, 4) });
