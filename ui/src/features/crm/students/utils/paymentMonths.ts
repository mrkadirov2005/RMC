import { getCenterMonthKey, getExpectedAmountForMonth, getDaysInGroupForMonth, coversExpectedAmount, type BillingPeriodRecord } from '@/shared/billingPeriod';
import { groupPriceFor } from '@/shared/groupPrices';

// The group view's payment circles: the current month and the two before it, oldest first.
export type PaymentMonthState = 'full' | 'partial' | 'none' | 'outside';

export type PaymentMonth = {
  key: string; // YYYY-MM
  state: PaymentMonthState;
  paid: number; // paid plus discounts given on those payments
  expected: number;
};

type PaymentLike = {
  payment_date?: string | null;
  amount?: number | string | null;
  discount_amount?: number | string | null;
  status?: string | null;
  payment_status?: string | null;
};

export const PAYMENT_MONTH_COUNT = 3;

/** The last `count` months as YYYY-MM in Tashkent time, oldest first. */
export const recentMonthKeys = (count = PAYMENT_MONTH_COUNT, now = new Date()) => {
  const [year, month] = getCenterMonthKey(now).split('-').map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (count - 1 - index), 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
};

const isCompleted = (payment: PaymentLike) => {
  const status = String(payment.status || payment.payment_status || '').trim().toLowerCase();
  return status === 'completed' || status === 'paid';
};

/**
 * One student record's state for each month: fully paid, partly paid, nothing, or not in the group
 * that month. Payments count for the month of their payment date; a discount on a payment counts
 * towards the fee, so a discounted student who paid their share shows as fully paid.
 */
export const getPaymentMonths = (
  record: BillingPeriodRecord,
  monthlyFee: unknown,
  payments: PaymentLike[],
  monthKeys = recentMonthKeys()
): PaymentMonth[] =>
  monthKeys.map((key) => {
    const paid = payments
      .filter((payment) => isCompleted(payment) && String(payment.payment_date || '').slice(0, 7) === key)
      .reduce((sum, payment) => sum + Number(payment.amount || 0) + Number(payment.discount_amount || 0), 0);
    // The group's price in that month (its price history), else the fee given.
    const expected = getExpectedAmountForMonth(record, groupPriceFor(record.class_id, key, monthlyFee), key);
    if (getDaysInGroupForMonth(record, key).days === 0 && paid <= 0) return { key, state: 'outside', paid, expected: 0 };
    if (paid <= 0) return { key, state: 'none', paid, expected };
    if (expected > 0 && !coversExpectedAmount(paid, expected)) return { key, state: 'partial', paid, expected };
    return { key, state: 'full', paid, expected };
  });
