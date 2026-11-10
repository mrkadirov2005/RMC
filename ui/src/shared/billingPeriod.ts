import { groupLessonDaysFor } from './groupPrices';

// A student record's time in its group. A transfer gives the old record an end_date and the new
// one a start_date; a start date can also be entered for a new student. Records without them are
// billed for whole months.
export interface BillingPeriodRecord {
  start_date?: unknown;
  end_date?: unknown;
  /** The record's group, for the group's price in a month (shared/groupPrices). */
  class_id?: unknown;
}


const toDay = (value: unknown) => {
  const day = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

/** Today as YYYY-MM-DD in Tashkent, where the centers are. */
export const getCenterToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A month's price covers this many lessons. */
export const LESSONS_PER_MONTH = 12;

/**
 * The share of the month's price the record owes. A whole month in the group is 1. A month the
 * student joined or left partway through is 1/12 for each of the group's lesson days they were in
 * the group (at most 12); a group without lesson days in its schedule goes by calendar days.
 * Same rule as the backend's billing_month_share.
 */
export const getMonthShare = (record: BillingPeriodRecord | null | undefined, monthKey: string, lessonDays: string[] = []) => {
  const { days, totalDays } = getDaysInGroupForMonth(record, monthKey);
  if (days === 0) return 0;
  if (days === totalDays) return 1;
  if (!lessonDays.length) return days / totalDays;
  const [year, month] = monthKey.split('-').map(Number);
  const start = toDay(record?.start_date);
  const firstDay = start && start > `${monthKey}-01` ? Number(start.slice(8, 10)) : 1;
  let lessons = 0;
  for (let day = firstDay; day < firstDay + days; day += 1) {
    if (lessonDays.includes(DAY_NAMES[new Date(Date.UTC(year, month - 1, day)).getUTCDay()])) lessons += 1;
  }
  return Math.min(lessons, LESSONS_PER_MONTH) / LESSONS_PER_MONTH;
};

/**
 * What this record owes for the month: the full price for a whole month, and by lessons for a
 * month the student joined or left partway through (12 lessons a month). The group's lesson days
 * come from `lessonDays`, or else the loaded group schedules (shared/groupPrices) by class_id.
 */
export const getExpectedAmountForMonth = (
  record: BillingPeriodRecord | null | undefined,
  monthlyAmount: unknown,
  monthKey: string,
  lessonDays?: string[]
) => {
  const monthly = Number(monthlyAmount || 0);
  if (!monthly || !/^\d{4}-\d{2}$/.test(monthKey)) return monthly;
  const share = getMonthShare(record, monthKey, lessonDays ?? groupLessonDaysFor(record?.class_id));
  return share === 1 ? monthly : roundMoney(monthly * share);
};

/**
 * What the payment form fills in this month: the fee for the lessons in the group this month (a
 * student who starts with 5 lessons left owes 5 of 12), rounded up to whole so'm for cash. A
 * student who hasn't started yet is paying ahead, so they get the whole fee.
 */
export const getFeeToCollectThisMonth = (record: BillingPeriodRecord | null | undefined, monthlyAmount: unknown, now = new Date()) => {
  const monthly = Number(monthlyAmount || 0);
  const expected = getExpectedAmountForMonth(record, monthly, getCenterMonthKey(now));
  return expected > 0 ? Math.ceil(expected) : monthly;
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
