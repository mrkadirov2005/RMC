const { and, desc, eq, lte, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { discounts } = require('../../../db/schema');

const db = pool.db;

const selection = {
  discount_id: discounts.discountId,
  student_id: discounts.studentId,
  center_id: discounts.centerId,
  discount_type: discounts.discountType,
  discount_kind: discounts.discountKind,
  value: discounts.value,
  original_price: discounts.originalPrice,
  final_price: discounts.finalPrice,
  reason: discounts.reason,
  payment_period: discounts.paymentPeriod,
  start_date: discounts.startDate,
  end_date: discounts.endDate,
  active: discounts.active,
  created_at: discounts.createdAt,
  updated_at: discounts.updatedAt,
};

const findAllFiltered = (filters: { studentId?: number; centerId?: number; active?: boolean; discountKind?: string } = {}) => {
  const conditions: any[] = [];
  if (filters.studentId) conditions.push(eq(discounts.studentId, filters.studentId));
  if (filters.centerId) conditions.push(eq(discounts.centerId, filters.centerId));
  if (filters.active !== undefined) conditions.push(eq(discounts.active, filters.active));
  if (filters.discountKind) conditions.push(eq(discounts.discountKind, filters.discountKind));
  let query = db.select(selection).from(discounts).orderBy(desc(discounts.createdAt));
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

const findById = async (id: number, centerId?: number) => {
  const conditions = [eq(discounts.discountId, id)];
  if (centerId) conditions.push(eq(discounts.centerId, centerId));
  const rows = await db.select(selection).from(discounts).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const activeConditions = (studentId: number, centerId?: number, discountKind?: string) => {
  const conditions: any[] = [
    eq(discounts.studentId, studentId),
    eq(discounts.active, true),
    or(sql`${discounts.startDate} IS NULL`, lte(discounts.startDate, sql`CURRENT_DATE`)),
    or(sql`${discounts.endDate} IS NULL`, sql`${discounts.endDate} >= CURRENT_DATE`),
  ];
  if (centerId) conditions.push(eq(discounts.centerId, centerId));
  if (discountKind) conditions.push(eq(discounts.discountKind, discountKind));
  return conditions;
};

const findActiveSerialByStudent = async (studentId: number, centerId?: number) => {
  const rows = await db
    .select(selection)
    .from(discounts)
    .where(and(...activeConditions(studentId, centerId, 'serial_discount')))
    .orderBy(desc(discounts.createdAt))
    .limit(1);
  return rows[0] || null;
};

const findActiveByStudent = async (studentId: number, centerId?: number, discountKind?: string) => {
  const rows = await db
    .select(selection)
    .from(discounts)
    .where(and(...activeConditions(studentId, centerId, discountKind)))
    .orderBy(sql`CASE ${discounts.discountKind} WHEN 'serial_discount' THEN 1 ELSE 2 END`, desc(discounts.createdAt))
    .limit(1);
  return rows[0] || null;
};

const insert = async (params: any[]) => {
  const rows = await db
    .insert(discounts)
    .values({
      studentId: params[0],
      centerId: params[1],
      discountType: params[2],
      discountKind: params[3],
      value: params[4],
      originalPrice: params[5],
      finalPrice: params[6],
      reason: params[7],
      paymentPeriod: params[8],
      startDate: params[9],
      endDate: params[10],
      active: params[11],
    })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, params: any[], centerId?: number, queryable: any = db) => {
  const conditions = [eq(discounts.discountId, id)];
  if (centerId) conditions.push(eq(discounts.centerId, centerId));
  const rows = await queryable
    .update(discounts)
    .set({
      discountType: sql`COALESCE(${params[0] ?? null}, ${discounts.discountType})`,
      discountKind: sql`COALESCE(${params[1] ?? null}, ${discounts.discountKind})`,
      value: sql`COALESCE(${params[2] ?? null}, ${discounts.value})`,
      originalPrice: sql`COALESCE(${params[3] ?? null}, ${discounts.originalPrice})`,
      finalPrice: sql`COALESCE(${params[4] ?? null}, ${discounts.finalPrice})`,
      reason: sql`COALESCE(${params[5] ?? null}, ${discounts.reason})`,
      paymentPeriod: sql`COALESCE(${params[6] ?? null}, ${discounts.paymentPeriod})`,
      startDate: sql`COALESCE(${params[7] ?? null}, ${discounts.startDate})`,
      endDate: sql`COALESCE(${params[8] ?? null}, ${discounts.endDate})`,
      active: sql`COALESCE(${params[9] ?? null}, ${discounts.active})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(...conditions))
    .returning(selection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const conditions = [eq(discounts.discountId, id)];
  if (centerId) conditions.push(eq(discounts.centerId, centerId));
  const rows = await db.delete(discounts).where(and(...conditions)).returning(selection);
  return rows[0] || null;
};

module.exports = { findAllFiltered, findById, findActiveSerialByStudent, findActiveByStudent, insert, update, remove };

export {};
