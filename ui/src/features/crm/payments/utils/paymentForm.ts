import type { Payment } from '../types';

export const createPaymentReference = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const getTodayPaymentDate = () => new Date().toISOString().slice(0, 10);

export const createPaymentDraft = (
  centerId: number,
  overrides: Partial<Payment> = {}
): Partial<Payment> => ({
  center_id: centerId,
  currency: 'UZS',
  payment_method: 'Cash',
  payment_type: 'Tuition',
  status: 'Completed',
  payment_status: 'Completed',
  payment_date: getTodayPaymentDate(),
  receipt_number: createPaymentReference(),
  transaction_reference: createPaymentReference(),
  ...overrides,
});

export const normalizePaymentFormData = (
  payment: Partial<Payment>,
  fallbackCenterId: number
): Partial<Payment> => {
  const normalizedStatus = payment.status || payment.payment_status || 'Completed';

  return createPaymentDraft(fallbackCenterId, {
    ...payment,
    center_id: payment.center_id ?? fallbackCenterId,
    status: normalizedStatus,
    payment_status: normalizedStatus,
    receipt_number: payment.receipt_number || createPaymentReference(),
    transaction_reference:
      payment.transaction_reference || payment.reference_number || createPaymentReference(),
  });
};
