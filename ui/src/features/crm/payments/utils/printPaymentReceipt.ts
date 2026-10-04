import { paymentAPI } from '../api';
import { showToast } from '@/utils/toast';
import { buildReceiptHtml, printReceiptHtml, RECEIPT_LOGO_PATH } from './paymentReceipt';

export const getCreatedPaymentId = (response: unknown): number | null => {
  const data = (response as { data?: { payment_id?: unknown } } | null)?.data;
  const id = Number(data?.payment_id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// Loads a payment's receipt data from the server and opens the print dialog.
export const printPaymentReceipt = async (paymentId: number | null | undefined) => {
  if (!paymentId) return;
  try {
    const { data } = await paymentAPI.getReceipt(paymentId);
    await printReceiptHtml(buildReceiptHtml(data, `${window.location.origin}${RECEIPT_LOGO_PATH}`));
  } catch (error: unknown) {
    const err = error as { response?: { data?: { error?: string } } };
    showToast.error(err?.response?.data?.error || "To'lov chekini chop etib bo'lmadi");
  }
};
