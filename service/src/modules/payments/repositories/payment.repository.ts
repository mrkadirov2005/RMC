const { and, desc, eq, isNotNull, isNull, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, payments, students } = require('../../../db/schema');
const { effectiveEndDateSql } = require('../../discounts/repositories/discount.repository');

type PaymentListOptions = {
  centerId?: number;
  teacherId?: number;
  limit?: number;
  offset?: number;
  studentId?: number;
};

const db = pool.db;

const paymentSelection = () => ({
  payment_id: payments.paymentId,
  student_id: payments.studentId,
  center_id: payments.centerId,
  payment_date: payments.paymentDate,
  amount: payments.amount,
  currency: payments.currency,
  payment_method: payments.paymentMethod,
  transaction_reference: payments.transactionReference,
  receipt_number: payments.receiptNumber,
  payment_status: payments.paymentStatus,
  payment_type: payments.paymentType,
  notes: payments.notes,
  discount_id: payments.discountId,
  discount_kind: payments.discountKind,
  discount_value_type: payments.discountValueType,
  discount_value: payments.discountValue,
  original_amount: payments.originalAmount,
  discount_amount: payments.discountAmount,
  final_amount: payments.finalAmount,
  is_complete: payments.isComplete,
  received_by_name: payments.receivedByName,
  deleted_at: payments.deletedAt,
  created_at: payments.createdAt,
  updated_at: payments.updatedAt,
});

const paymentListSelection = () => ({
  ...paymentSelection(),
  student_first_name: students.firstName,
  student_last_name: students.lastName,
  student_class_id: students.classId,
  student_teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
  student_status: students.status,
  student_deleted_at: students.deletedAt,
  student_class_name: classes.className,
});

const scopedPaymentConditions = (id: number, active: boolean, centerId?: number, teacherId?: number) => {
  const conditions: any[] = [eq(payments.paymentId, id), active ? isNull(payments.deletedAt) : isNotNull(payments.deletedAt)];
  if (centerId) conditions.push(eq(payments.centerId, centerId));
  if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
  return conditions;
};

const findAll = (options: PaymentListOptions = {}) => {
  const { centerId, teacherId, limit, offset, studentId } = options;
  const conditions: any[] = [isNull(payments.deletedAt)];
  if (teacherId) {
    conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
    conditions.push(or(isNull(students.deletedAt), eq(students.status, 'Transferred')));
  }
  if (centerId) conditions.push(eq(payments.centerId, centerId));
  if (studentId) conditions.push(eq(payments.studentId, studentId));

  let query = db
    .select(paymentListSelection())
    .from(payments)
    .leftJoin(students, eq(students.studentId, payments.studentId))
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(...conditions))
    .orderBy(desc(payments.paymentId));
  if (limit) query = query.limit(limit);
  if (offset) query = query.offset(offset);
  return query;
};

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .select(paymentSelection())
    .from(payments)
    .leftJoin(students, eq(students.studentId, payments.studentId))
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(...scopedPaymentConditions(id, true, centerId, teacherId)))
    .limit(1);
  return rows[0] || null;
};

const insert = async (params: any[], queryable: any = db) => {
  const rows = await queryable
    .insert(payments)
    .values({
      studentId: params[0],
      centerId: params[1],
      paymentDate: params[2],
      amount: params[3],
      currency: params[4],
      paymentMethod: params[5],
      transactionReference: params[6],
      receiptNumber: params[7],
      paymentStatus: params[8],
      paymentType: params[9],
      notes: params[10],
      discountId: params[11],
      discountKind: params[12],
      discountValueType: params[13],
      discountValue: params[14],
      originalAmount: params[15],
      discountAmount: params[16],
      finalAmount: params[17],
      isComplete: params[18],
      receivedByName: params[19] ?? null,
    })
    .returning(paymentSelection());
  return rows[0];
};

const withTransaction = (callback: (tx: any) => Promise<any>) => db.transaction(callback);

const update = async (id: number, params: any[], centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(payments)
    .set({
      amount: sql`COALESCE(${params[0] ?? null}, ${payments.amount})`,
      paymentStatus: sql`COALESCE(${params[1] ?? null}, ${payments.paymentStatus})`,
      notes: sql`COALESCE(${params[2] ?? null}, ${payments.notes})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(payments.paymentId, id), isNull(payments.deletedAt)))
    .returning(paymentSelection());
  return rows[0] || null;
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) => {
  const conditions: any[] = [eq(payments.studentId, studentId), isNull(payments.deletedAt)];
  if (centerId) conditions.push(eq(payments.centerId, centerId));
  if (teacherId) conditions.push(sql`COALESCE(${classes.teacherId}, ${students.teacherId}) = ${teacherId}`);
  return db
    .select(paymentSelection())
    .from(payments)
    .leftJoin(students, eq(students.studentId, payments.studentId))
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(...conditions))
    .orderBy(desc(payments.paymentDate), desc(payments.paymentId));
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(payments)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(payments.paymentId, id), isNull(payments.deletedAt)))
    .returning(paymentSelection());
  return rows[0] || null;
};

const purge = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .select(paymentSelection())
    .from(payments)
    .leftJoin(students, eq(students.studentId, payments.studentId))
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(...scopedPaymentConditions(id, false, centerId, teacherId)))
    .limit(1);
  if (!rows[0]) return null;
  const deleted = await db.delete(payments).where(and(eq(payments.paymentId, id), isNotNull(payments.deletedAt))).returning(paymentSelection());
  return deleted[0] || null;
};

// Everything a printed receipt shows, resolved from the payment's own group record:
// subject (first subject of the class, else the class name), teacher, and the center's
// contact details for the footer.
const findReceipt = async (id: number, centerId?: number) => {
  const result = await pool.query(
    `SELECT p.payment_id, p.receipt_number, p.payment_date::text AS payment_date, p.created_at,
            p.amount, p.currency, p.payment_method, p.original_amount, p.discount_amount,
            p.covered_from::text AS covered_from, p.received_by_name,
            s.first_name AS student_first_name, s.last_name AS student_last_name,
            c.class_name, c.payment_amount AS class_payment_amount,
            subj.subject_name,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
            ec.center_name, ec.phone AS center_phone, ec.address AS center_address
     FROM payments p
     LEFT JOIN students s ON s.student_id = p.student_id
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN LATERAL (
       SELECT subject_name FROM subjects WHERE class_id = c.class_id ORDER BY subject_id LIMIT 1
     ) subj ON true
     LEFT JOIN teachers t ON t.teacher_id = COALESCE(c.teacher_id, s.teacher_id)
     LEFT JOIN edu_centers ec ON ec.center_id = p.center_id
     WHERE p.payment_id = $1 AND p.deleted_at IS NULL AND ($2::int IS NULL OR p.center_id = $2)`,
    [id, centerId ?? null]
  );
  return result.rows[0] || null;
};

// Full name of the owner or admin account that is recording a payment.
const findStaffName = async (table: 'owners' | 'superusers', id: number) => {
  const key = table === 'owners' ? 'owner_id' : 'superuser_id';
  const result = await pool.query(
    `SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '') AS full_name, username FROM ${table} WHERE ${key} = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? (row.full_name || row.username || null) : null;
};

// Every active student's payments over a date range, with their group, teacher and subject, for
// the dashboard's payments page: filtered and paged (100 per page) in SQL, plus totals for the
// whole filtered list. Expected = the group's monthly fee x the months the range touches, less
// discounts: what payments in the range already took off (serial or one-month), and the active
// serial discount for each month in the range that has no payment yet.
const findStudentPaymentSummary = async (filters: {
  centerId?: number;
  from: string;
  to: string;
  months: number;
  status?: 'paid' | 'partial' | 'unpaid';
  teacherId?: number;
  classId?: number;
  subject?: string;
  q?: string;
  limit: number;
  offset: number;
}) => {
  const params: any[] = [filters.from, filters.to, filters.months];
  const where: string[] = ['s.deleted_at IS NULL', "LOWER(COALESCE(s.status::text, 'Active')) = 'active'"];
  const add = (value: any) => { params.push(value); return `$${params.length}`; };
  if (filters.centerId) where.push(`s.center_id = ${add(filters.centerId)}`);
  if (filters.teacherId) where.push(`COALESCE(c.teacher_id, s.teacher_id) = ${add(filters.teacherId)}`);
  if (filters.classId) where.push(`s.class_id = ${add(filters.classId)}`);
  if (filters.subject) where.push(`EXISTS (SELECT 1 FROM subjects sub WHERE sub.class_id = s.class_id AND LOWER(sub.subject_name) = LOWER(${add(filters.subject)}))`);
  if (filters.q) {
    const term = add(`%${filters.q}%`);
    where.push(`(CONCAT_WS(' ', s.first_name, s.last_name) ILIKE ${term} OR CONCAT_WS(' ', s.last_name, s.first_name) ILIKE ${term}
      OR regexp_replace(COALESCE(s.phone, ''), '\\D', '', 'g') LIKE ${add(`%${String(filters.q).replace(/\D/g, '') || '~'}%`)})`);
  }
  const statusFilter = filters.status ? `WHERE state = ${add(filters.status)}` : '';
  const limit = add(filters.limit);
  const offset = add(filters.offset);

  const result = await pool.query(
    `WITH base AS (
       SELECT s.student_id, s.first_name, s.last_name, s.phone, s.parent_phone, s.class_id,
              c.class_name, COALESCE(c.payment_amount, 0)::numeric AS monthly_fee,
              COALESCE(c.teacher_id, s.teacher_id) AS teacher_id,
              NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name,
              (SELECT string_agg(DISTINCT sub.subject_name, ', ') FROM subjects sub WHERE sub.class_id = s.class_id) AS subject,
              COALESCE(p.paid, 0)::numeric AS paid_amount, COALESCE(p.payments_count, 0)::int AS payments_count, p.last_payment_date,
              COALESCE(p.discounts, 0)::numeric AS discount_applied, COALESCE(p.paid_months, 0)::int AS paid_months,
              CASE
                WHEN sd.discount_type = 'percent' THEN LEAST(COALESCE(c.payment_amount, 0), COALESCE(c.payment_amount, 0) * LEAST(GREATEST(sd.value, 0), 100) / 100)
                WHEN sd.value IS NOT NULL THEN LEAST(COALESCE(c.payment_amount, 0), GREATEST(sd.value, 0))
                ELSE 0
              END::numeric AS serial_discount_per_month
       FROM students s
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN teachers t ON t.teacher_id = COALESCE(c.teacher_id, s.teacher_id)
       LEFT JOIN LATERAL (
         SELECT SUM(pay.amount) AS paid, COUNT(*) AS payments_count, MAX(pay.payment_date)::text AS last_payment_date,
                SUM(COALESCE(pay.discount_amount, 0)) AS discounts,
                COUNT(DISTINCT date_trunc('month', pay.payment_date)) AS paid_months
         FROM payments pay
         WHERE pay.student_id = s.student_id AND pay.deleted_at IS NULL
           AND LOWER(COALESCE(pay.payment_status::text, '')) IN ('completed', 'paid')
           AND pay.payment_date >= $1::date AND pay.payment_date <= $2::date
       ) p ON true
       LEFT JOIN LATERAL (
         SELECT d.discount_type, d.value::numeric AS value
         FROM discounts d
         WHERE d.student_id = s.student_id AND d.active = TRUE AND d.discount_kind = 'serial_discount'
           AND (d.start_date IS NULL OR d.start_date <= CURRENT_DATE)
           AND (${effectiveEndDateSql('d')} IS NULL OR ${effectiveEndDateSql('d')} >= CURRENT_DATE)
         ORDER BY d.created_at DESC
         LIMIT 1
       ) sd ON true
       WHERE ${where.join(' AND ')}
     ),
     owed AS (
       SELECT *,
              monthly_fee * $3::int AS expected_before_discount,
              serial_discount_per_month * GREATEST($3::int - paid_months, 0) AS pending_discount
       FROM base
     ),
     netted AS (
       SELECT *, GREATEST(expected_before_discount - discount_applied - pending_discount, 0) AS expected
       FROM owed
     ),
     scored AS (
       -- Fully covered by discounts (e.g. 100% off) counts as paid; a group with no fee stays as before.
       SELECT *,
              GREATEST(expected_before_discount - discount_applied - paid_amount, 0) AS remaining_before_discount,
              CASE WHEN paid_amount <= 0 AND discount_applied <= 0 AND NOT (expected_before_discount > 0 AND expected <= 0) THEN 'unpaid'
                   WHEN expected > 0 AND paid_amount + 0.01 < expected THEN 'partial'
                   ELSE 'paid' END AS state
       FROM netted
     ),
     totals AS (
       SELECT COUNT(*)::int AS students,
              COUNT(*) FILTER (WHERE state = 'paid')::int AS paid_students,
              COUNT(*) FILTER (WHERE state = 'partial')::int AS partial_students,
              COUNT(*) FILTER (WHERE state = 'unpaid')::int AS unpaid_students,
              COALESCE(SUM(paid_amount), 0)::numeric AS collected,
              COALESCE(SUM(GREATEST(expected - paid_amount, 0)), 0)::numeric AS remaining
       FROM scored
     ),
     filtered AS (SELECT * FROM scored ${statusFilter})
     SELECT (SELECT row_to_json(totals) FROM totals) AS totals,
            (SELECT COUNT(*)::int FROM filtered) AS total,
            COALESCE((SELECT json_agg(page) FROM (
              SELECT * FROM filtered ORDER BY last_name NULLS LAST, first_name, student_id LIMIT ${limit} OFFSET ${offset}
            ) page), '[]'::json) AS rows`,
    params
  );
  return result.rows[0];
};

module.exports = { findStudentPaymentSummary, findAll, findById, insert, withTransaction, update, findByStudent, remove, purge, findReceipt, findStaffName };

export {};
