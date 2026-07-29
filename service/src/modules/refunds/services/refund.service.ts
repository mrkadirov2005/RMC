const refundRepository = require('../repositories/refund.repository');
const paymentRepository = require('../../payments/repositories/payment.repository');

const list = (query: { payment_id?: string; status?: string }, centerId?: number) => {
  return refundRepository.findAllFiltered({
    paymentId: query.payment_id ? Number(query.payment_id) : undefined,
    status: query.status,
    centerId,
  });
};

const getById = async (id: number, centerId?: number) => {
  const row = await refundRepository.findById(id);
  if (!row) return null;
  if (centerId) {
    const payment = await paymentRepository.findById(row.payment_id, centerId);
    if (!payment) return null;
  }
  return row;
};

const create = async (body: any, centerId?: number) => {
  const { payment_id, amount, reason } = body;
  if (centerId) {
    const payment = await paymentRepository.findById(Number(payment_id), centerId);
    if (!payment) return { error: 'invalid_center' as const };
  }
  return refundRepository.insert([payment_id, amount, reason || null]).then((row: any) => ({ row }));
};

const update = async (id: number, body: any, centerId?: number) => {
  const { status, refunded_at } = body;
  if (centerId) {
    const existing = await refundRepository.findById(id);
    if (!existing) return null;
    const payment = await paymentRepository.findById(existing.payment_id, centerId);
    if (!payment) return null;
  }
  const row = await refundRepository.update(id, status, refunded_at);
  if (row && status === 'Processed') {
    await refundRepository.updatePaymentRefunded(row.payment_id);
  }
  return row;
};

const remove = async (id: number, centerId?: number) => {
  if (centerId) {
    const existing = await refundRepository.findById(id);
    if (!existing) return null;
    const payment = await paymentRepository.findById(existing.payment_id, centerId);
    if (!payment) return null;
  }
  return refundRepository.remove(id);
};

module.exports = { list, getById, create, update, remove };

export {};
