const paymentRepository = require('../repositories/payment.repository');

const listPayments = (centerId?: number, teacherId?: number) => paymentRepository.findAll(centerId, teacherId);

const getPayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.findById(id, centerId, teacherId);

const createPayment = (body: any, centerId?: number) => {
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
  } = body;
  return paymentRepository.insert([
    student_id,
    centerId || body.center_id,
    payment_date,
    amount,
    currency || 'USD',
    payment_method || 'Cash',
    transaction_reference,
    receipt_number,
    payment_status || 'Completed',
    payment_type,
    notes,
  ]);
};

const updatePayment = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { amount, payment_status, notes } = body;
  return paymentRepository.update(id, [amount, payment_status, notes], centerId, teacherId);
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  paymentRepository.findByStudent(studentId, centerId, teacherId);

const deletePayment = (id: number, centerId?: number, teacherId?: number) => paymentRepository.remove(id, centerId, teacherId);

module.exports = {
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  listByStudent,
  deletePayment,
};

export {};
