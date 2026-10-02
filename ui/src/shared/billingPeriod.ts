// A student record's time in its group. Only transfers set these dates: the old record gets an
// end_date, the new one a start_date. Records without them are billed for whole months, as before.
export interface BillingPeriodRecord {
  start_date?: unknown;
  end_date?: unknown;
}

const toDay = (value: unknown) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** The current month as YYYY-MM in Tashkent, where the centers are. */
export const getCenterMonthKey = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now);

/** How many days of the month (YYYY-MM) the record spent in its group. */
export const getDaysInGroupForMonth = (record: BillingPeriodRecord | null | undefined, monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(totalDays).padStart(2, '0')}`;
  const start = toDay(record?.start_date);
  const end = toDay(record?.end_date);
  const from = start && start > monthStart ? start : monthStart;
  const to = end && end < monthEnd ? end : monthEnd;
  if (from > to) return { days: 0, totalDays };
  return { days: Number(to.slice(8, 10)) - Number(from.slice(8, 10)) + 1, totalDays };
};

/** The share of the monthly fee this record owes for the month, by calendar days in the group. */
export const getExpectedAmountForMonth = (
  record: BillingPeriodRecord | null | undefined,
  monthlyAmount: unknown,
  monthKey: string
) => {
  const monthly = Number(monthlyAmount || 0);
  if (!monthly || !/^\d{4}-\d{2}$/.test(monthKey)) return monthly;
  const { days, totalDays } = getDaysInGroupForMonth(record, monthKey);
  return days === totalDays ? monthly : roundMoney((monthly * days) / totalDays);
};

/** Paid at least the expected amount, allowing for cent rounding in transfer splits. */
export const coversExpectedAmount = (paidAmount: number, expectedAmount: number) => paidAmount + 0.01 >= expectedAmount;

/** Whether the record was still in its group on this date (YYYY-MM-DD). */
export const wasInGroupOn = (record: BillingPeriodRecord | null | undefined, date: unknown) => {
  const day = toDay(date);
  if (!day) return true;
  const start = toDay(record?.start_date);
  const end = toDay(record?.end_date);
  return (!start || start <= day) && (!end || end >= day);
};
