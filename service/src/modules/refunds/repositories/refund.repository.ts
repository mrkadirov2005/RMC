const { and, desc, eq, inArray, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { payments, refunds } = require('../../../db/schema');

const db = pool.db;

const selection = {
  refund_id: refunds.refundId,
  payment_id: refunds.paymentId,
  amount: refunds.amount,
  reason: refunds.reason,
  status: refunds.status,
  refunded_at: refunds.refundedAt,
  created_at: refunds.createdAt,
  updated_at: refunds.updatedAt,
};

const findAllFiltered = async (filters: { paymentId?: number; status?: string; centerId?: number } = {}) => {
  const conditions: any[] = [];
  if (filters.paymentId) conditions.push(eq(refunds.paymentId, filters.paymentId));
  if (filters.status) conditions.push(eq(refunds.status, filters.status));
  if (filters.centerId) {
    const scopedPayments = await db
      .select({ paymentId: payments.paymentId })
      .from(payments)
      .where(and(eq(payments.centerId, filters.centerId), isNull(payments.deletedAt)));
    const paymentIds = scopedPayments.map((payment: any) => payment.paymentId);
    if (paymentIds.length === 0) return [];
    conditions.push(inArray(refunds.paymentId, paymentIds));
  }
  let query = db.select(selection).from(refunds).orderBy(desc(refunds.createdAt));
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

const findById = async (id: number) => {
  const rows = await db.select(selection).from(refunds).where(eq(refunds.refundId, id)).limit(1);
  return rows[0] || null;
};

const insert = async (params: any[]) => {
  const rows = await db
    .insert(refunds)
    .values({ paymentId: params[0], amount: params[1], reason: params[2] })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, status: any, refunded_at: any) => {
  const rows = await db
    .update(refunds)
    .set({
      status: sql`COALESCE(${status ?? null}, ${refunds.status})`,
      refundedAt: sql`COALESCE(${refunded_at ?? null}, ${refunds.refundedAt})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(refunds.refundId, id))
    .returning(selection);
  return rows[0] || null;
};

const updatePaymentRefunded = (paymentId: number) =>
  db
    .update(payments)
    .set({ paymentStatus: 'Refunded', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(payments.paymentId, paymentId), isNull(payments.deletedAt)));

const remove = async (id: number) => {
  const rows = await db.delete(refunds).where(eq(refunds.refundId, id)).returning(selection);
  return rows[0] || null;
};

module.exports = { findAllFiltered, findById, insert, update, updatePaymentRefunded, remove };

export {};
