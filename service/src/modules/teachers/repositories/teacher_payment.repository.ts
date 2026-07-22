const pool = require('../../../db/pool');
const { db } = pool;
const { eq, sql } = require('drizzle-orm');
const { teacherPaymentCredentials } = require('../../../db/schema');

const findByTeacherId = (teacherId: number) =>
  db
    .select({
      teacherId: teacherPaymentCredentials.teacherId,
      passwordHash: teacherPaymentCredentials.passwordHash,
      isActive: teacherPaymentCredentials.isActive,
    })
    .from(teacherPaymentCredentials)
    .where(eq(teacherPaymentCredentials.teacherId, teacherId))
    .then((rows: any[]) => rows[0] || null);

const upsertPassword = (teacherId: number, passwordHash: string, updatedBy?: number) =>
  db
    .insert(teacherPaymentCredentials)
    .values({
      teacherId,
      passwordHash,
      createdBy: updatedBy || null,
      updatedBy: updatedBy || null,
    })
    .onConflictDoUpdate({
      target: teacherPaymentCredentials.teacherId,
      set: {
        passwordHash,
        updatedBy: updatedBy || null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning({
      teacherId: teacherPaymentCredentials.teacherId,
      isActive: teacherPaymentCredentials.isActive,
      updatedAt: teacherPaymentCredentials.updatedAt,
    })
    .then((rows: any[]) => rows[0] || null);

const markUsed = (teacherId: number) =>
  db
    .update(teacherPaymentCredentials)
    .set({ lastUsedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(teacherPaymentCredentials.teacherId, teacherId));

module.exports = {
  findByTeacherId,
  upsertPassword,
  markUsed,
};

export {};
