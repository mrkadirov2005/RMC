const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { studentCoinTransactions, students } = require('../../../db/schema');

const db = pool.db;

const txSelection = {
  transaction_id: studentCoinTransactions.transactionId,
  student_id: studentCoinTransactions.studentId,
  center_id: studentCoinTransactions.centerId,
  delta: studentCoinTransactions.delta,
  reason: studentCoinTransactions.reason,
  created_by: studentCoinTransactions.createdBy,
  created_by_type: studentCoinTransactions.createdByType,
  source_type: studentCoinTransactions.sourceType,
  source_id: studentCoinTransactions.sourceId,
  metadata: studentCoinTransactions.metadata,
  created_at: studentCoinTransactions.createdAt,
  updated_at: studentCoinTransactions.updatedAt,
};

const findStudent = async (queryable: any, studentId: number) => {
  const rows = await queryable
    .select({ student_id: students.studentId, center_id: students.centerId, teacher_id: students.teacherId, coins: students.coins })
    .from(students)
    .where(and(eq(students.studentId, studentId), isNull(students.deletedAt)))
    .limit(1);
  return rows[0] || null;
};

const listTransactions = (studentId: number, centerId?: number, teacherId?: number) => {
  const conditions = [eq(studentCoinTransactions.studentId, studentId), isNull(students.deletedAt)];
  if (centerId) conditions.push(eq(students.centerId, centerId));
  if (teacherId) conditions.push(eq(students.teacherId, teacherId));
  return db
    .select(txSelection)
    .from(studentCoinTransactions)
    .innerJoin(students, eq(students.studentId, studentCoinTransactions.studentId))
    .where(and(...conditions))
    .orderBy(desc(studentCoinTransactions.transactionId));
};

const addTransaction = async (
  studentId: number,
  delta: number,
  reason: string | null,
  createdBy: number | null,
  createdByType: string | null
) =>
  db.transaction(async (tx: any) => {
    const student = await findStudent(tx, studentId);
    if (!student) return { error: 'not_found' as const };

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins + delta;
    const MIN_COINS = -9999;
    if (nextCoins < MIN_COINS) return { error: 'insufficient' as const, balance: currentCoins };

    await tx
      .update(students)
      .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, studentId), isNull(students.deletedAt)));

    const rows = await tx
      .insert(studentCoinTransactions)
      .values({ studentId, centerId: student.center_id, delta, reason, createdBy, createdByType })
      .returning(txSelection);

    return { balance: nextCoins, transaction: rows[0] };
  });

const upsertSourceTransaction = async (
  studentId: number,
  delta: number,
  reason: string | null,
  sourceType: string,
  sourceId: number,
  createdBy: number | null,
  createdByType: string | null
) =>
  db.transaction(async (tx: any) => {
    const student = await findStudent(tx, studentId);
    if (!student) return { error: 'not_found' as const };

    const existingRows = await tx
      .select({ transaction_id: studentCoinTransactions.transactionId, delta: studentCoinTransactions.delta })
      .from(studentCoinTransactions)
      .where(and(eq(studentCoinTransactions.studentId, studentId), eq(studentCoinTransactions.sourceType, sourceType), eq(studentCoinTransactions.sourceId, sourceId)))
      .limit(1);
    const existing = existingRows[0];
    const previousDelta = Number(existing?.delta || 0);
    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins + (delta - previousDelta);
    const MIN_COINS = -9999;
    if (nextCoins < MIN_COINS) return { error: 'insufficient' as const, balance: currentCoins };

    await tx
      .update(students)
      .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, studentId), isNull(students.deletedAt)));

    const rows = existing
      ? await tx
          .update(studentCoinTransactions)
          .set({ delta, reason, createdBy, createdByType, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(eq(studentCoinTransactions.transactionId, existing.transaction_id))
          .returning(txSelection)
      : await tx
          .insert(studentCoinTransactions)
          .values({ studentId, centerId: student.center_id, delta, reason, createdBy, createdByType, sourceType, sourceId })
          .returning(txSelection);

    return { balance: nextCoins, transaction: rows[0] };
  });

const updateTransaction = async (
  studentId: number,
  transactionId: number,
  delta: number,
  reason: string | null
) =>
  db.transaction(async (tx: any) => {
    const student = await findStudent(tx, studentId);
    if (!student) return { error: 'not_found' as const };

    const existingRows = await tx
      .select({ delta: studentCoinTransactions.delta })
      .from(studentCoinTransactions)
      .where(and(eq(studentCoinTransactions.transactionId, transactionId), eq(studentCoinTransactions.studentId, studentId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) return { error: 'tx_not_found' as const };

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins + (delta - Number(existing.delta));
    if (nextCoins < 0) return { error: 'insufficient' as const, balance: currentCoins };

    await tx
      .update(students)
      .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, studentId), isNull(students.deletedAt)));

    const rows = await tx
      .update(studentCoinTransactions)
      .set({ delta, reason, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(studentCoinTransactions.transactionId, transactionId))
      .returning(txSelection);

    return { balance: nextCoins, transaction: rows[0] };
  });

const deleteTransaction = async (studentId: number, transactionId: number) =>
  db.transaction(async (tx: any) => {
    const student = await findStudent(tx, studentId);
    if (!student) return { error: 'not_found' as const };

    const existingRows = await tx
      .select({ delta: studentCoinTransactions.delta })
      .from(studentCoinTransactions)
      .where(and(eq(studentCoinTransactions.transactionId, transactionId), eq(studentCoinTransactions.studentId, studentId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) return { error: 'tx_not_found' as const };

    const currentCoins = Number(student.coins || 0);
    const nextCoins = currentCoins - Number(existing.delta);
    if (nextCoins < 0) return { error: 'insufficient' as const, balance: currentCoins };

    await tx
      .update(students)
      .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, studentId), isNull(students.deletedAt)));

    await tx.delete(studentCoinTransactions).where(eq(studentCoinTransactions.transactionId, transactionId));
    return { balance: nextCoins };
  });

module.exports = {
  listTransactions,
  addTransaction,
  upsertSourceTransaction,
  updateTransaction,
  deleteTransaction,
};

export {};
