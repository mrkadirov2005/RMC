import type { Payment } from '../types';

export const getMonthStart = (value = new Date()) => new Date(value.getFullYear(), value.getMonth(), 1);

export const addMonths = (value: Date, months: number) =>
  new Date(value.getFullYear(), value.getMonth() + months, 1);

export const getMonthKey = (value: Date | string | undefined) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const getMonthLabel = (value: Date) =>
  value.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

export const getSixMonthWindow = (endMonth: Date) =>
  Array.from({ length: 6 }, (_, index) => addMonths(endMonth, index - 5));

export const isPaidPayment = (payment: Partial<Payment>) => {
  const status = String(payment.status || payment.payment_status || '')
    .trim()
    .toLowerCase();
  return status === 'completed' || status === 'paid';
};

export const getMonthPaymentState = (payments: Partial<Payment>[], expectedAmount: number) => {
  const paidAmount = payments
    .filter(isPaidPayment)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  if (paidAmount <= 0) return 'none';
  if (expectedAmount > 0 && paidAmount < expectedAmount) return 'partial';
  return 'full';
};

export const getMonthPaymentStatus = (state: string) => {
  if (state === 'full') {
    return { label: 'Fully done', className: 'bg-emerald-600 text-white' };
  }
  if (state === 'partial') {
    return { label: 'Partly done', className: 'bg-amber-500 text-white' };
  }
  return { label: 'None', className: 'bg-rose-600 text-white' };
};
