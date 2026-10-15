const { asc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { centers } = require('../../../db/schema');

const db = pool.db;

const findAll = (centerId?: number) => {
  const query = db.select().from(centers).orderBy(asc(centers.centerId));
  return centerId ? query.where(eq(centers.centerId, centerId)) : query;
};

const findById = async (id: number, centerId?: number) => {
  const rows = await db
    .select()
    .from(centers)
    .where(eq(centers.centerId, centerId != null ? centerId : id))
    .limit(1);
  return rows[0] || null;
};

// Each branch's counts. Written as plain SQL with aliases: drizzle prints columns inside sql``
// without their table, so "students.center_id = edu_centers.center_id" came out as
// "center_id" = "center_id" (always true) and every branch showed the totals of all branches.
const PAID = "LOWER(COALESCE(p.payment_status::text, '')) IN ('completed', 'paid')";
const BRANCH = '"edu_centers"."center_id"';

const getSummaries = (centerId?: number) => {
  const query = db
    .select({
      center_id: centers.centerId,
      students: sql.raw(`(SELECT COUNT(*)::int FROM students s WHERE s.center_id = ${BRANCH} AND s.deleted_at IS NULL)`),
      teachers: sql.raw(`(SELECT COUNT(*)::int FROM teachers t WHERE t.center_id = ${BRANCH} AND t.deleted_at IS NULL)`),
      classes: sql.raw(`(SELECT COUNT(*)::int FROM classes c WHERE c.center_id = ${BRANCH} AND c.deleted_at IS NULL)`),
      payments: sql.raw(`(SELECT COUNT(*)::int FROM payments p WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL)`),
      current_month_payments: sql.raw(`(
        SELECT COUNT(*)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID}
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
          AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      )`),
      previous_month_payments: sql.raw(`(
        SELECT COUNT(*)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID}
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month'
          AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE)
      )`),
      paid_students_this_month: sql.raw(`(
        SELECT COUNT(DISTINCT p.student_id)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID}
          AND p.payment_date >= DATE_TRUNC('month', CURRENT_DATE)
          AND p.payment_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
      )`),
      today_payments: sql.raw(`(
        SELECT COUNT(*)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID} AND p.payment_date = CURRENT_DATE
      )`),
      yesterday_payments: sql.raw(`(
        SELECT COUNT(*)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID} AND p.payment_date = CURRENT_DATE - 1
      )`),
      paid_students_today: sql.raw(`(
        SELECT COUNT(DISTINCT p.student_id)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID} AND p.payment_date = CURRENT_DATE
      )`),
      paid_students_yesterday: sql.raw(`(
        SELECT COUNT(DISTINCT p.student_id)::int FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL AND ${PAID} AND p.payment_date = CURRENT_DATE - 1
      )`),
      attendance_present: sql.raw(`(
        SELECT COUNT(*)::int FROM attendance a
        WHERE a.center_id = ${BRANCH} AND LOWER(COALESCE(a.status::text, '')) IN ('present', 'late')
      )`),
      attendance_absent: sql.raw(`(
        SELECT COUNT(*)::int FROM attendance a
        WHERE a.center_id = ${BRANCH} AND LOWER(COALESCE(a.status::text, '')) IN ('absent', 'absent nr', 'absent r')
      )`),
      collected: sql.raw(`(
        SELECT COALESCE(SUM(CASE WHEN ${PAID} THEN COALESCE(p.amount, 0) ELSE 0 END), 0)::numeric
        FROM payments p
        WHERE p.center_id = ${BRANCH} AND p.deleted_at IS NULL
      )`),
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
    .where(eq(centers.centerId, centerId != null ? centerId : id))
    .returning();
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const rows = await db.delete(centers).where(eq(centers.centerId, centerId != null ? centerId : id)).returning();
  return rows[0] || null;
};

module.exports = { findAll, findById, getSummaries, insert, update, remove };

export {};
