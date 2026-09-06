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

const sumNonRejectedRefunds = async (paymentId: number, excludeRefundId?: number) => {
  const existingRefunds = (await refundRepository.findAllFiltered({ paymentId })) || [];
  return existingRefunds
    .filter((r: any) => r.status !== 'Rejected' && r.refund_id !== excludeRefundId)
    .reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
};

const ensureWithinRefundCap = async (paymentId: number, amount: number, payment: any, excludeRefundId?: number) => {
  const cap = Number(payment?.final_amount ?? payment?.amount ?? 0);
  const alreadyRefunded = await sumNonRejectedRefunds(paymentId, excludeRefundId);
  if (alreadyRefunded + Number(amount || 0) > cap) {
    return { error: 'refund_exceeds_payment' as const };
  }
  return null;
};

const create = async (body: any, centerId?: number) => {
  const { payment_id, amount, reason } = body;
  const payment = await paymentRepository.findById(Number(payment_id), centerId);
  if (!payment) {
    return centerId ? { error: 'invalid_center' as const } : { error: 'payment_not_found' as const };
  }
  const capError = await ensureWithinRefundCap(Number(payment_id), Number(amount), payment);
  if (capError) return capError;
  return refundRepository.insert([payment_id, amount, reason || null]).then((row: any) => ({ row }));
};

const update = async (id: number, body: any, centerId?: number) => {
  const { status, refunded_at } = body;
  const existing = await refundRepository.findById(id);
  if (!existing) return null;

  let payment: any = null;
  if (centerId) {
    payment = await paymentRepository.findById(existing.payment_id, centerId);
    if (!payment) return null;
  }

  if (status === 'Processed') {
    payment = payment || (await paymentRepository.findById(existing.payment_id, centerId));
    if (payment) {
      const capError = await ensureWithinRefundCap(existing.payment_id, Number(existing.amount || 0), payment, id);
      if (capError) return capError;
    }
    return refundRepository.withTransaction(async (client: any) => {
      const row = await refundRepository.update(id, status, refunded_at, client);
      if (row) await refundRepository.updatePaymentRefunded(row.payment_id, client);
      return row;
    });
  }

  return refundRepository.update(id, status, refunded_at);
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
