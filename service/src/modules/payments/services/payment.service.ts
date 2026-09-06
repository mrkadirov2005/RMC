const paymentRepository = require('../repositories/payment.repository');
const discountService = require('../../discounts/services/discount.service');
const debtRepository = require('../../debts/repositories/debt.repository');
const invoiceRepository = require('../../invoices/repositories/invoice.repository');

const listPayments = (options: {
  centerId?: number;
  teacherId?: number;
  limit?: number;
  offset?: number;
  studentId?: number;
} = {}) => paymentRepository.findAll(options);

const getPayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.findById(id, centerId, teacherId);

const resolveAppliedDiscount = (
  kind: 'monthly_discount' | 'serial_discount',
  discountId: any,
  discountType: string,
  discountValue: number,
  originalAmount: number
) => {
  const calculated = discountService.calculateDiscount(originalAmount, discountType, Number(discountValue));
  return {
    discount_id: discountId,
    discount_kind: kind,
    discount_value_type: discountType,
    discount_value: Number(discountValue),
    original_amount: calculated.originalAmount,
    discount_amount: calculated.discountAmount,
    final_amount: calculated.finalAmount,
  };
};

const syncDebtAfterPayment = async (client: any, studentId: number, paidAmount: number) => {
  if (!(paidAmount > 0)) return;
  const openDebts = await debtRepository.findOpenDebtsForStudent(Number(studentId), client);
  const debt = openDebts[0];
  if (!debt) return;
  const currentBalance = Number(debt.balance || 0);
  const currentPaid = Number(debt.amount_paid || 0);
  const newBalance = Math.max(0, currentBalance - paidAmount);
  const newAmountPaid = currentPaid + paidAmount;
  await debtRepository.applyPayment(debt.debt_id, newAmountPaid, newBalance, client);
};

const syncInvoiceAfterPayment = async (
  client: any,
  studentId: number,
  centerId: number | undefined,
  paymentDate: string,
  paidAmount: number
) => {
  if (!(paidAmount > 0)) return;
  const invoice = await invoiceRepository.findOpenInvoiceForPeriod(Number(studentId), centerId, paymentDate, client);
  if (!invoice) return;
  const total = Number(invoice.total || 0);
  const nextStatus = paidAmount >= total ? 'Paid' : 'Partially Paid';
  await invoiceRepository.updateStatus(invoice.invoice_id, nextStatus, client);
};

const createPayment = async (body: any, centerId?: number) => {
  const {
    student_id,
    payment_date,
    amount,
    currency,
    payment_method,
    transaction_reference,
    receipt_number,
    payment_status,
    payment_type,
    notes,
    discount_id,
    discount_kind,
    discount_value_type,
    discount_value,
    original_amount,
    discount_amount,
    final_amount,
    is_complete,
  } = body;
  const scopedCenterId = centerId || body.center_id;
  const paymentDate = payment_date || new Date().toISOString().slice(0, 10);
  const originalAmount = Number(original_amount ?? amount ?? 0);
  let appliedDiscount: any = null;

  if (discount_kind === 'monthly_discount' && Number(discount_value || 0) > 0) {
    appliedDiscount = resolveAppliedDiscount(
      'monthly_discount',
      discount_id || null,
      discount_value_type || 'fixed',
      Number(discount_value),
      originalAmount
    );
  } else {
    const monthlyDiscount = await discountService.getActiveByStudent(Number(student_id), Number(scopedCenterId), 'monthly_discount');
    const serialDiscount = monthlyDiscount
      ? null
      : await discountService.getActiveSerialByStudent(Number(student_id), Number(scopedCenterId));
    if (monthlyDiscount) {
      appliedDiscount = resolveAppliedDiscount(
        'monthly_discount',
        monthlyDiscount.discount_id,
        monthlyDiscount.discount_type,
        Number(monthlyDiscount.value),
        originalAmount
      );
    }
    if (serialDiscount) {
      appliedDiscount = resolveAppliedDiscount(
        'serial_discount',
        serialDiscount.discount_id,
        serialDiscount.discount_type,
        Number(serialDiscount.value),
        originalAmount
      );
    }
  }

  const resolvedOriginalAmount = Number(appliedDiscount?.original_amount ?? originalAmount);
  const resolvedDiscountAmount = Number(appliedDiscount?.discount_amount ?? 0);
  const resolvedFinalAmount = Number(appliedDiscount?.final_amount ?? Math.max(0, resolvedOriginalAmount - resolvedDiscountAmount));
  const paidAmount = Number(amount || 0);
  const complete = is_complete ?? paidAmount >= resolvedFinalAmount;

  const paymentPayload = [
    student_id,
    scopedCenterId,
    paymentDate,
    amount,
    currency || 'UZS',
    payment_method || 'Cash',
    transaction_reference,
    receipt_number,
    payment_status || 'Completed',
    payment_type,
    notes,
    discount_id || appliedDiscount?.discount_id || null,
    discount_kind || appliedDiscount?.discount_kind || null,
    discount_value_type || appliedDiscount?.discount_value_type || null,
    discount_value ?? appliedDiscount?.discount_value ?? 0,
    resolvedOriginalAmount,
    resolvedDiscountAmount,
    resolvedFinalAmount,
    complete,
  ];

  return paymentRepository.withTransaction(async (client: any) => {
    const createdPayment = await paymentRepository.insert(paymentPayload, client);

    if (appliedDiscount?.discount_kind === 'monthly_discount' && appliedDiscount?.discount_id) {
      await discountService.update(appliedDiscount.discount_id, { active: false }, Number(scopedCenterId), client);
    }

    await syncDebtAfterPayment(client, student_id, resolvedFinalAmount);
    await syncInvoiceAfterPayment(client, student_id, scopedCenterId, paymentDate, resolvedFinalAmount);

    return createdPayment;
  });
};

const updatePayment = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { amount, payment_status, notes } = body;
  return paymentRepository.update(id, [amount, payment_status, notes], centerId, teacherId);
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  paymentRepository.findByStudent(studentId, centerId, teacherId);

const deletePayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.remove(id, centerId, teacherId);

const purgePayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.purge(id, centerId, teacherId);

module.exports = {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  listByStudent,
  deletePayment,
  purgePayment,
};

export {};
