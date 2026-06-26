const paymentRepository = require('../repositories/payment.repository');
const discountService = require('../../discounts/services/discount.service');

const listPayments = (options: {
  centerId?: number;
  teacherId?: number;
  limit?: number;
  offset?: number;
  studentId?: number;
} = {}) => paymentRepository.findAll(options);

const getPayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.findById(id, centerId, teacherId);

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
    const valueType = discount_value_type || 'fixed';
    const calculated = discountService.calculateDiscount(originalAmount, valueType, Number(discount_value));
    appliedDiscount = {
      discount_id: discount_id || null,
      discount_kind: 'monthly_discount',
      discount_value_type: valueType,
      discount_value: Number(discount_value),
      original_amount: calculated.originalAmount,
      discount_amount: calculated.discountAmount,
      final_amount: calculated.finalAmount,
    };
  } else {
    const serialDiscount = await discountService.getActiveSerialByStudent(Number(student_id), Number(scopedCenterId));
    if (serialDiscount) {
      const calculated = discountService.calculateDiscount(
        originalAmount,
        serialDiscount.discount_type,
        Number(serialDiscount.value)
      );
      appliedDiscount = {
        discount_id: serialDiscount.discount_id,
        discount_kind: 'serial_discount',
        discount_value_type: serialDiscount.discount_type,
        discount_value: Number(serialDiscount.value),
        original_amount: calculated.originalAmount,
        discount_amount: calculated.discountAmount,
        final_amount: calculated.finalAmount,
      };
    }
  }

  const resolvedOriginalAmount = Number(appliedDiscount?.original_amount ?? originalAmount);
  const resolvedDiscountAmount = Number(discount_amount ?? appliedDiscount?.discount_amount ?? 0);
  const resolvedFinalAmount = Number(final_amount ?? appliedDiscount?.final_amount ?? Math.max(0, resolvedOriginalAmount - resolvedDiscountAmount));
  const paidAmount = Number(amount || 0);
  const complete = is_complete ?? paidAmount >= resolvedFinalAmount;

  return paymentRepository.insert([
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
  ]);
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
