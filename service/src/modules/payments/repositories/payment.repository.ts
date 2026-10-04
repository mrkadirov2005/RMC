const { and, desc, eq, isNotNull, isNull, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, payments, students } = require('../../../db/schema');

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

module.exports = { findAll, findById, insert, withTransaction, update, findByStudent, remove, purge, findReceipt, findStaffName };

export {};
