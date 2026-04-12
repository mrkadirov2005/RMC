const refundRepository = require('../repositories/refund.repository');
const paymentRepository = require('../../payments/repositories/payment.repository');

const list = (query: { payment_id?: string; status?: string }, centerId?: number) => {
  const params: any[] = [];
  const conditions: string[] = [];
  if (query.payment_id) {
    params.push(query.payment_id);
    conditions.push(`payment_id = $${params.length}`);
  }
  if (query.status) {
    params.push(query.status);
    conditions.push(`status = $${params.length}`);
  }
  if (centerId) {
    params.push(centerId);
    conditions.push(`payment_id IN (SELECT payment_id FROM payments WHERE center_id = $${params.length})`);
  }
  return refundRepository.findAllFiltered(conditions, params);
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
  if (!payment_id || !amount) return { error: 'validation' as const };
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
