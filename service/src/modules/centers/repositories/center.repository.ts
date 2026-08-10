const { asc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { centers, classes, payments, students, teachers } = require('../../../db/schema');

const db = pool.db;

const findAll = (centerId?: number) => {
  const query = db.select().from(centers).orderBy(asc(centers.centerId));
  return centerId ? query.where(eq(centers.centerId, centerId)) : query;
};

const findById = async (id: number, centerId?: number) => {
  const rows = await db
    .select()
    .from(centers)
    .where(eq(centers.centerId, centerId || id))
    .limit(1);
  return rows[0] || null;
};

const getSummaries = (centerId?: number) => {
  const query = db
    .select({
      center_id: centers.centerId,
      students: sql`(SELECT COUNT(*)::int FROM ${students} WHERE ${students.centerId} = ${centers.centerId} AND ${students.deletedAt} IS NULL)`,
      teachers: sql`(SELECT COUNT(*)::int FROM ${teachers} WHERE ${teachers.centerId} = ${centers.centerId} AND ${teachers.deletedAt} IS NULL)`,
      classes: sql`(SELECT COUNT(*)::int FROM ${classes} WHERE ${classes.centerId} = ${centers.centerId} AND ${classes.deletedAt} IS NULL)`,
      payments: sql`(SELECT COUNT(*)::int FROM ${payments} WHERE ${payments.centerId} = ${centers.centerId} AND ${payments.deletedAt} IS NULL)`,
      current_month_payments: sql`(
        SELECT COUNT(*)::int FROM ${payments}
        WHERE ${payments.centerId} = ${centers.centerId}
          AND ${payments.deletedAt} IS NULL
          AND LOWER(COALESCE(${payments.paymentStatus}, '')) IN ('completed', 'paid')
          AND ${payments.paymentDate} >= DATE_TRUNC('month', CURRENT_DATE)
          AND ${payments.paymentDate} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      )`,
      previous_month_payments: sql`(
        SELECT COUNT(*)::int FROM ${payments}
        WHERE ${payments.centerId} = ${centers.centerId}
          AND ${payments.deletedAt} IS NULL
          AND LOWER(COALESCE(${payments.paymentStatus}, '')) IN ('completed', 'paid')
          AND ${payments.paymentDate} >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
          AND ${payments.paymentDate} < DATE_TRUNC('month', CURRENT_DATE)
      )`,
      paid_students_this_month: sql`(
        SELECT COUNT(DISTINCT ${payments.studentId})::int FROM ${payments}
        WHERE ${payments.centerId} = ${centers.centerId}
          AND ${payments.deletedAt} IS NULL
          AND LOWER(COALESCE(${payments.paymentStatus}, '')) IN ('completed', 'paid')
          AND ${payments.paymentDate} >= DATE_TRUNC('month', CURRENT_DATE)
          AND ${payments.paymentDate} < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      )`,
      collected: sql`(
        SELECT COALESCE(SUM(CASE WHEN LOWER(COALESCE(${payments.paymentStatus}, '')) IN ('completed', 'paid') THEN COALESCE(${payments.amount}, 0) ELSE 0 END), 0)::numeric
        FROM ${payments}
        WHERE ${payments.centerId} = ${centers.centerId} AND ${payments.deletedAt} IS NULL
      )`,
    })
    .from(centers)
    .orderBy(asc(centers.centerId));
  return centerId ? query.where(eq(centers.centerId, centerId)) : query;
};

const insert = async (values: any[]) => {
  const rows = await db
    .insert(centers)
    .values({
      centerName: values[0],
      centerCode: values[1],
      email: values[2],
      phone: values[3],
      address: values[4],
      city: values[5],
      principalName: values[6],
    })
    .returning();
  return rows[0];
};

const update = async (id: number, values: any[], centerId?: number) => {
  const rows = await db
    .update(centers)
    .set({
      centerName: sql`COALESCE(${values[0] ?? null}, ${centers.centerName})`,
      email: sql`COALESCE(${values[1] ?? null}, ${centers.email})`,
      phone: sql`COALESCE(${values[2] ?? null}, ${centers.phone})`,
      address: sql`COALESCE(${values[3] ?? null}, ${centers.address})`,
      city: sql`COALESCE(${values[4] ?? null}, ${centers.city})`,
      principalName: sql`COALESCE(${values[5] ?? null}, ${centers.principalName})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(centers.centerId, centerId || id))
    .returning();
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const rows = await db.delete(centers).where(eq(centers.centerId, centerId || id)).returning();
  return rows[0] || null;
};

module.exports = { findAll, findById, getSummaries, insert, update, remove };

export {};
