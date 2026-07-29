const { and, asc, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { paymentPlanInstallments, paymentPlans } = require('../../../db/schema');

const db = pool.db;

const planSelection = {
  plan_id: paymentPlans.planId,
  center_id: paymentPlans.centerId,
  student_id: paymentPlans.studentId,
  name: paymentPlans.name,
  total_amount: paymentPlans.totalAmount,
  currency: paymentPlans.currency,
  start_date: paymentPlans.startDate,
  end_date: paymentPlans.endDate,
  status: paymentPlans.status,
  created_at: paymentPlans.createdAt,
  updated_at: paymentPlans.updatedAt,
};

const installmentSelection = {
  installment_id: paymentPlanInstallments.installmentId,
  plan_id: paymentPlanInstallments.planId,
  due_date: paymentPlanInstallments.dueDate,
  amount: paymentPlanInstallments.amount,
  status: paymentPlanInstallments.status,
  created_at: paymentPlanInstallments.createdAt,
  updated_at: paymentPlanInstallments.updatedAt,
};

const findAllFiltered = (filters: { studentId?: number; centerId?: number; status?: string } = {}) => {
  const conditions: any[] = [];
  if (filters.studentId) conditions.push(eq(paymentPlans.studentId, filters.studentId));
  if (filters.centerId) conditions.push(eq(paymentPlans.centerId, filters.centerId));
  if (filters.status) conditions.push(eq(paymentPlans.status, filters.status));
  let query = db.select(planSelection).from(paymentPlans).orderBy(desc(paymentPlans.createdAt));
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

const findPlanById = async (id: number, centerId?: number) => {
  const conditions = [eq(paymentPlans.planId, id)];
  if (centerId) conditions.push(eq(paymentPlans.centerId, centerId));
  const rows = await db.select(planSelection).from(paymentPlans).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const findInstallments = (planId: number) =>
  db.select(installmentSelection).from(paymentPlanInstallments).where(eq(paymentPlanInstallments.planId, planId)).orderBy(asc(paymentPlanInstallments.dueDate));

const insertPlan = async (params: any[]) => {
  const rows = await db
    .insert(paymentPlans)
    .values({
      studentId: params[0],
      centerId: params[1],
      name: params[2],
      totalAmount: params[3],
      currency: params[4],
      startDate: params[5],
      endDate: params[6],
    })
    .returning(planSelection);
  return rows[0];
};

const insertInstallment = (planId: number, due_date: any, amount: any, status?: string) =>
  db.insert(paymentPlanInstallments).values({ planId, dueDate: due_date, amount, status: status || 'Pending' });

const insertInstallmentSimple = (planId: number, due_date: any, amount: any) =>
  db.insert(paymentPlanInstallments).values({ planId, dueDate: due_date, amount });

const updatePlan = async (id: number, params: any[], centerId?: number) => {
  const conditions = [eq(paymentPlans.planId, id)];
  if (centerId) conditions.push(eq(paymentPlans.centerId, centerId));
  const rows = await db
    .update(paymentPlans)
    .set({
      name: sql`COALESCE(${params[0] ?? null}, ${paymentPlans.name})`,
      totalAmount: sql`COALESCE(${params[1] ?? null}, ${paymentPlans.totalAmount})`,
      currency: sql`COALESCE(${params[2] ?? null}, ${paymentPlans.currency})`,
      startDate: sql`COALESCE(${params[3] ?? null}, ${paymentPlans.startDate})`,
      endDate: sql`COALESCE(${params[4] ?? null}, ${paymentPlans.endDate})`,
      status: sql`COALESCE(${params[5] ?? null}, ${paymentPlans.status})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(...conditions))
    .returning(planSelection);
  return rows[0] || null;
};

const deleteInstallmentsByPlan = (planId: number) =>
  db.delete(paymentPlanInstallments).where(eq(paymentPlanInstallments.planId, planId));

const deletePlan = async (id: number, centerId?: number) => {
  const conditions = [eq(paymentPlans.planId, id)];
  if (centerId) conditions.push(eq(paymentPlans.centerId, centerId));
  const rows = await db.delete(paymentPlans).where(and(...conditions)).returning(planSelection);
  return rows[0] || null;
};

module.exports = {
  findAllFiltered,
  findPlanById,
  findInstallments,
  insertPlan,
  insertInstallment,
  insertInstallmentSimple,
  updatePlan,
  deleteInstallmentsByPlan,
  deletePlan,
};

export {};
