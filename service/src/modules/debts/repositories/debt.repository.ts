const { and, asc, desc, eq, gte, isNull, lte, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { debts, payments, students } = require('../../../db/schema');

const db = pool.db;

const debtSelection = {
  debt_id: debts.debtId,
  center_id: debts.centerId,
  student_id: debts.studentId,
  debt_amount: debts.debtAmount,
  debt_date: debts.debtDate,
  due_date: debts.dueDate,
  amount_paid: debts.amountPaid,
  balance: debts.balance,
  remarks: debts.remarks,
  status: debts.status,
  created_at: debts.createdAt,
  updated_at: debts.updatedAt,
};

const scopedDebtConditions = (centerId?: number, teacherId?: number) => {
  const conditions: any[] = [isNull(debts.deletedAt)];
  if (centerId) conditions.push(eq(debts.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId), isNull(students.deletedAt));
  return conditions;
};

const debtQuery = (conditions: any[], teacherId?: number, orderBy: any = desc(debts.debtId)) => {
  let query = db.select(debtSelection).from(debts);
  if (teacherId) query = query.innerJoin(students, eq(students.studentId, debts.studentId));
  return query.where(and(...conditions)).orderBy(orderBy);
};

const findAll = (centerId?: number, teacherId?: number) => {
  const conditions = scopedDebtConditions(centerId, teacherId);
  return debtQuery(conditions.length ? conditions : [sql`TRUE`], teacherId);
};

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await debtQuery([eq(debts.debtId, id), ...scopedDebtConditions(centerId, teacherId)], teacherId).limit(1);
  return rows[0] || null;
};

const insert = async (params: any[]) => {
  const rows = await db
    .insert(debts)
    .values({
      studentId: params[0],
      centerId: params[1],
      debtAmount: params[2],
      debtDate: params[3],
      dueDate: params[4],
      amountPaid: params[5],
      balance: params[6],
      remarks: params[7],
    })
    .returning(debtSelection);
  return rows[0];
};

const findAmounts = async (id: number) => {
  const rows = await db.select({ debt_amount: debts.debtAmount, amount_paid: debts.amountPaid }).from(debts).where(eq(debts.debtId, id)).limit(1);
  return rows[0] || null;
};

const updatePaid = async (id: number, amount_paid: number, balance: number, remarks: any, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(debts)
    .set({ amountPaid: amount_paid, balance, remarks: sql`COALESCE(${remarks ?? null}, ${debts.remarks})`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(debts.debtId, id))
    .returning(debtSelection);
  return rows[0] || null;
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  debtQuery([eq(debts.studentId, studentId), ...scopedDebtConditions(centerId, teacherId)], teacherId, desc(debts.debtDate));

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db.delete(debts).where(eq(debts.debtId, id)).returning(debtSelection);
  return rows[0] || null;
};

const findActiveStudents = (center_id?: string, teacherId?: number) => {
  const conditions = [eq(students.status, 'Active'), isNull(students.deletedAt)];
  if (center_id) conditions.push(eq(students.centerId, Number(center_id)));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  return db
    .select({
      student_id: students.studentId,
      first_name: students.firstName,
      last_name: students.lastName,
      enrollment_number: students.enrollmentNumber,
      center_id: students.centerId,
    })
    .from(students)
    .where(and(...conditions));
};

const findPaymentsForStudentInRange = (studentId: number, start: Date, end: Date) =>
  db
    .select({
      payment_date: payments.paymentDate,
      amount: payments.amount,
      payment_status: payments.paymentStatus,
      payment_type: payments.paymentType,
    })
    .from(payments)
    .where(and(eq(payments.studentId, studentId), gte(payments.paymentDate, start.toISOString().slice(0, 10)), lte(payments.paymentDate, end.toISOString().slice(0, 10)), eq(payments.paymentStatus, 'Completed'), isNull(payments.deletedAt)))
    .orderBy(asc(payments.paymentDate));

const findOpenDebtsForStudent = (studentId: number) =>
  db
    .select({
      debt_id: debts.debtId,
      debt_amount: debts.debtAmount,
      debt_date: debts.debtDate,
      due_date: debts.dueDate,
      amount_paid: debts.amountPaid,
      balance: debts.balance,
    })
    .from(debts)
    .where(and(eq(debts.studentId, studentId), sql`${debts.balance} > 0`))
    .orderBy(asc(debts.debtDate));

const getStudentCenter = async (studentId: number) => {
  const rows = await db.select({ center_id: students.centerId }).from(students).where(and(eq(students.studentId, studentId), isNull(students.deletedAt))).limit(1);
  return rows[0]?.center_id;
};

const paymentMonthlySummary = (studentId: number) =>
  db
    .select({
      year: sql`EXTRACT(YEAR FROM ${payments.paymentDate})`,
      month: sql`EXTRACT(MONTH FROM ${payments.paymentDate})`,
      total_paid: sql`SUM(${payments.amount})`,
      payment_count: sql`COUNT(*)`,
    })
    .from(payments)
    .where(and(eq(payments.studentId, studentId), eq(payments.paymentStatus, 'Completed'), isNull(payments.deletedAt)))
    .groupBy(sql`EXTRACT(YEAR FROM ${payments.paymentDate})`, sql`EXTRACT(MONTH FROM ${payments.paymentDate})`)
    .orderBy(desc(sql`EXTRACT(YEAR FROM ${payments.paymentDate})`), desc(sql`EXTRACT(MONTH FROM ${payments.paymentDate})`));

const debtAggregate = async (studentId: number) => {
  const rows = await db
    .select({
      total_debt: sql`SUM(${debts.debtAmount})`,
      total_paid: sql`SUM(${debts.amountPaid})`,
      total_balance: sql`SUM(${debts.balance})`,
    })
    .from(debts)
    .where(eq(debts.studentId, studentId));
  return rows[0];
};

module.exports = {
  findAll,
  findById,
  insert,
  findAmounts,
  updatePaid,
  findByStudent,
  remove,
  findActiveStudents,
  findPaymentsForStudentInRange,
  findOpenDebtsForStudent,
  getStudentCenter,
  paymentMonthlySummary,
  debtAggregate,
};

export {};
