// Money collected per day of the current month, for the dashboard's payments chart.

type PaymentLike = Record<string, unknown>;

export interface PaymentDay {
  key: string;
  label: string;
  amount: number;
  count: number;
}

/** A date as YYYY-MM-DD in Tashkent, where the centers are (UTC dates would shift days by one). */
export const centerDayKey = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

export const isCollectedPayment = (payment: PaymentLike) =>
  // A transfer only moves money between a student's two group records; nothing new came in.
  String(payment.payment_type || '') !== 'Transfer Adjustment' &&
  (payment.is_complete === true ||
    ['paid', 'completed', 'complete', 'success'].includes(String(payment.status || payment.payment_status || '').toLowerCase()));

/** One entry per day of the month `now` falls in (Tashkent time), with the money and payments that day. */
export const buildPaymentDays = (payments: PaymentLike[], now = new Date()): PaymentDay[] => {
  const monthKey = centerDayKey(now).slice(0, 7);
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const byDay = new Map<string, { amount: number; count: number }>();
  for (const payment of payments) {
    const key = String(payment.payment_date || '').slice(0, 10);
    if (!key.startsWith(monthKey) || !isCollectedPayment(payment)) continue;
    const day = byDay.get(key) || { amount: 0, count: 0 };
    day.amount += Number(payment.amount || 0) || 0;
    day.count += 1;
    byDay.set(key, day);
  }
  return Array.from({ length: daysInMonth }, (_, index) => {
    const key = `${monthKey}-${String(index + 1).padStart(2, '0')}`;
    return { key, label: String(index + 1), ...(byDay.get(key) || { amount: 0, count: 0 }) };
  });
};

/** The day before `now`, as YYYY-MM-DD in Tashkent. */
export const previousCenterDayKey = (now = new Date()) => {
  const [year, month, day] = centerDayKey(now).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
};
