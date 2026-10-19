const { and, asc, desc, eq, gte, ilike, isNotNull, isNull, lte, ne, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { TEACHER_FAULT_DELETE_REASONS, TEACHER_FAULT_TRANSFER_REASONS } = require('../../../shared/teacherFaultReasons');
const { attendance, classes, debts, payments, students, studentActionReasons, teachers } = require('../../../db/schema');

const db = pool.db;

const one = async (query: Promise<any[]>) => {
  const rows = await query;
  return rows[0];
};

const scoped = (table: any, centerId?: number) => (centerId ? [eq(table.centerId, centerId)] : []);

const countStudents = (centerId?: number) =>
  one(
    db
      .select({
        total: sql`COUNT(*)::int`,
        active: sql`SUM(CASE WHEN ${students.status} = 'Active' THEN 1 ELSE 0 END)::int`,
      })
      .from(students)
      .where(and(isNull(students.deletedAt), ...scoped(students, centerId))),
  );

const countTeachers = (centerId?: number) =>
  one(db.select({ total: sql`COUNT(*)::int` }).from(teachers).where(and(isNull(teachers.deletedAt), ...scoped(teachers, centerId))));

const countClasses = (centerId?: number) =>
  one(db.select({ total: sql`COUNT(*)::int` }).from(classes).where(and(isNull(classes.deletedAt), ...scoped(classes, centerId))));

const paymentFilters = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) => {
  const conditions: any[] = [eq(payments.paymentStatus, 'Completed'), isNull(payments.deletedAt)];
  if (filters.centerId) conditions.push(eq(payments.centerId, filters.centerId));
  if (filters.start) conditions.push(gte(payments.paymentDate, filters.start));
  if (filters.end) conditions.push(lte(payments.paymentDate, filters.end));
  return conditions;
};

const sumPayments = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  one(
    db
      .select({ total_revenue: sql`COALESCE(SUM(${payments.amount}),0)::numeric`, payments_count: sql`COUNT(*)::int` })
      .from(payments)
      .where(and(...paymentFilters(filters))),
  );

const sumDebts = (filters: { centerId?: number } = {}) => {
  const conditions: any[] = [sql`${debts.balance} > 0`];
  if (filters.centerId) conditions.push(eq(debts.centerId, filters.centerId));
  return one(db.select({ total_outstanding: sql`COALESCE(SUM(${debts.balance}),0)::numeric` }).from(debts).where(and(...conditions)));
};

const paymentsByMonth = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      year: sql`EXTRACT(YEAR FROM ${payments.paymentDate})::int`,
      month: sql`EXTRACT(MONTH FROM ${payments.paymentDate})::int`,
      payments_count: sql`COUNT(*)::int`,
      total_amount: sql`SUM(${payments.amount})::numeric`,
    })
    .from(payments)
    .where(and(...paymentFilters(filters)))
    .groupBy(sql`EXTRACT(YEAR FROM ${payments.paymentDate})`, sql`EXTRACT(MONTH FROM ${payments.paymentDate})`)
    .orderBy(desc(sql`EXTRACT(YEAR FROM ${payments.paymentDate})`), desc(sql`EXTRACT(MONTH FROM ${payments.paymentDate})`));

const paymentsAggregate = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  one(
    db
      .select({ payments_count: sql`COUNT(*)::int`, total_amount: sql`COALESCE(SUM(${payments.amount}),0)::numeric` })
      .from(payments)
      .where(and(...paymentFilters(filters))),
  );

const attendanceByStatus = (filters: { centerId?: number; classId?: number; start?: string | null; end?: string | null } = {}) => {
  const conditions: any[] = [];
  if (filters.centerId) conditions.push(eq(attendance.centerId, filters.centerId));
  if (filters.classId) conditions.push(eq(attendance.classId, filters.classId));
  if (filters.start) conditions.push(gte(attendance.attendanceDate, filters.start));
  if (filters.end) conditions.push(lte(attendance.attendanceDate, filters.end));
  let query = db.select({ status: attendance.status, count: sql`COUNT(*)::int` }).from(attendance).groupBy(attendance.status);
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

// Students who left the center. A transfer keeps the old record (status Transferred, not deleted),
// so a transferred student never counts here; the status check guards against old data too.
const retentionDeletedFilters = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) => {
  const conditions: any[] = [isNotNull(students.deletedAt), or(isNull(students.status), ne(students.status, 'Transferred'))];
  if (filters.centerId) conditions.push(eq(students.centerId, filters.centerId));
  if (filters.start) conditions.push(gte(sql`${students.deletedAt}::date`, filters.start));
  if (filters.end) conditions.push(lte(sql`${students.deletedAt}::date`, filters.end));
  return conditions;
};

const countDeletedStudents = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  one(
    db
      .select({ total: sql`COUNT(*)::int` })
      .from(students)
      .where(and(...retentionDeletedFilters(filters))),
  );

const deletedStudentsByMonth = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      year: sql`EXTRACT(YEAR FROM ${students.deletedAt})::int`,
      month: sql`EXTRACT(MONTH FROM ${students.deletedAt})::int`,
      month_start: sql`DATE_TRUNC('month', ${students.deletedAt})::date`,
      left_count: sql`COUNT(*)::int`,
    })
    .from(students)
    .where(and(...retentionDeletedFilters(filters)))
    .groupBy(sql`EXTRACT(YEAR FROM ${students.deletedAt})`, sql`EXTRACT(MONTH FROM ${students.deletedAt})`, sql`DATE_TRUNC('month', ${students.deletedAt})::date`)
    .orderBy(sql`DATE_TRUNC('month', ${students.deletedAt})::date`);

const deletedStudentsByClass = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      class_id: students.classId,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      left_count: sql`COUNT(*)::int`,
      latest_deleted_at: sql`MAX(${students.deletedAt})`,
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`))
    .where(and(...retentionDeletedFilters(filters)))
    .groupBy(students.classId, classes.className, classes.classCode, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`, teachers.firstName, teachers.lastName)
    .orderBy(desc(sql`COUNT(*)`));

const deletedStudentJson = sql`json_build_object(
  'student_id', ${students.studentId},
  'center_id', ${students.centerId},
  'enrollment_number', ${students.enrollmentNumber},
  'first_name', ${students.firstName},
  'last_name', ${students.lastName},
  'phone', ${students.phone},
  'status', ${students.status},
  'class_id', ${students.classId},
  'class_name', ${classes.className},
  'class_code', ${classes.classCode},
  'teacher_id', ${teachers.teacherId},
  'teacher_first_name', ${teachers.firstName},
  'teacher_last_name', ${teachers.lastName},
  'deleted_at', ${students.deletedAt},
  'reason_code', (SELECT r.reason_code FROM student_action_reasons r WHERE r.reason_id = ${students.deleteReasonId}),
  'reason_name', (SELECT r.reason_name FROM student_action_reasons r WHERE r.reason_id = ${students.deleteReasonId}),
  'reason_note', ${students.deleteReasonNote}
)`;

const deletedStudentsByTeacherWithStudents = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      employee_id: teachers.employeeId,
      left_count: sql`COUNT(DISTINCT ${students.studentId})::int`,
      latest_deleted_at: sql`MAX(${students.deletedAt})`,
      class_count: sql`COUNT(DISTINCT ${students.classId})::int`,
      students: sql`COALESCE(json_agg(${deletedStudentJson} ORDER BY ${students.deletedAt} DESC) FILTER (WHERE ${students.studentId} IS NOT NULL), '[]'::json)`,
    })
    .from(teachers)
    .leftJoin(
      students,
      and(
        ...retentionDeletedFilters(filters),
        eq(sql`COALESCE((SELECT c.teacher_id FROM classes c WHERE c.class_id = ${students.classId}), ${students.teacherId})`, teachers.teacherId),
      ),
    )
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(isNull(teachers.deletedAt), ...scoped(teachers, filters.centerId)))
    .groupBy(teachers.teacherId, teachers.firstName, teachers.lastName, teachers.employeeId)
    .orderBy(desc(sql`COUNT(DISTINCT ${students.studentId})`), asc(teachers.firstName), asc(teachers.lastName));

const recentDeletedStudents = (filters: { centerId?: number; start?: string | null; end?: string | null; limit?: number } = {}) =>
  db
    .select({
      student_id: students.studentId,
      center_id: students.centerId,
      enrollment_number: students.enrollmentNumber,
      first_name: students.firstName,
      last_name: students.lastName,
      phone: students.phone,
      status: students.status,
      class_id: students.classId,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      deleted_at: students.deletedAt,
      reason_code: studentActionReasons.reasonCode,
      reason_name: studentActionReasons.reasonName,
      reason_note: students.deleteReasonNote,
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`))
    .leftJoin(studentActionReasons, eq(studentActionReasons.reasonId, students.deleteReasonId))
    .where(and(...retentionDeletedFilters(filters)))
    .orderBy(desc(students.deletedAt), desc(students.studentId))
    .limit(Math.min(100, Math.max(1, Number(filters.limit || 25))));

// Why students left in the period, most common first (no reason recorded counts as its own row).
const deletedStudentsByReason = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      reason_id: studentActionReasons.reasonId,
      reason_code: studentActionReasons.reasonCode,
      reason_name: studentActionReasons.reasonName,
      left_count: sql`COUNT(*)::int`,
    })
    .from(students)
    .leftJoin(studentActionReasons, eq(studentActionReasons.reasonId, students.deleteReasonId))
    .where(and(...retentionDeletedFilters(filters)))
    .groupBy(studentActionReasons.reasonId, studentActionReasons.reasonCode, studentActionReasons.reasonName)
    .orderBy(desc(sql`COUNT(*)`));

// New students only: a transfer makes a new record in the new group, but the child did not join the center.
const intakeFilters = (filters: { centerId?: number; start?: string | null; end?: string | null; sourceId?: number; referredByTeacherId?: number; sourceDetail?: string } = {}) => {
  const conditions: any[] = [isNull(students.transferredFromStudentId)];
  if (filters.centerId) conditions.push(eq(students.centerId, filters.centerId));
  if (filters.start) conditions.push(gte(sql`${students.createdAt}::date`, filters.start));
  if (filters.end) conditions.push(lte(sql`${students.createdAt}::date`, filters.end));
  if (filters.sourceId) conditions.push(eq(students.acquisitionSourceId, filters.sourceId));
  if (filters.referredByTeacherId) conditions.push(eq(students.referredByTeacherId, filters.referredByTeacherId));
  if (filters.sourceDetail) conditions.push(ilike(students.acquisitionDetail, `%${filters.sourceDetail}%`));
  return conditions;
};

const countIntakeStudents = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  one(db.select({ total: sql`COUNT(*)::int` }).from(students).where(and(...intakeFilters(filters))));

const intakeStudentsByMonth = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db.select({
    month_start: sql`DATE_TRUNC('month', ${students.createdAt})::date`,
    left_count: sql`COUNT(*)::int`,
  }).from(students).where(and(...intakeFilters(filters)))
    .groupBy(sql`DATE_TRUNC('month', ${students.createdAt})::date`)
    .orderBy(sql`DATE_TRUNC('month', ${students.createdAt})::date`);

const intakeStudentsByClass = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db.select({
    class_id: students.classId,
    class_name: classes.className,
    class_code: classes.classCode,
    teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
    teacher_first_name: teachers.firstName,
    teacher_last_name: teachers.lastName,
    left_count: sql`COUNT(*)::int`,
    latest_deleted_at: sql`MAX(${students.createdAt})`,
  }).from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`))
    .where(and(...intakeFilters(filters)))
    .groupBy(students.classId, classes.className, classes.classCode, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`, teachers.firstName, teachers.lastName)
    .orderBy(desc(sql`COUNT(*)`));

const recentIntakeStudents = (filters: { centerId?: number; start?: string | null; end?: string | null; limit?: number } = {}) =>
  db.select({
    student_id: students.studentId,
    center_id: students.centerId,
    enrollment_number: students.enrollmentNumber,
    first_name: students.firstName,
    last_name: students.lastName,
    phone: students.phone,
    status: students.status,
    class_id: students.classId,
    class_name: classes.className,
    class_code: classes.classCode,
    teacher_id: sql`COALESCE(${classes.teacherId}, ${students.teacherId})`,
    teacher_first_name: teachers.firstName,
    teacher_last_name: teachers.lastName,
    created_at: students.createdAt,
    deleted_at: students.createdAt,
  }).from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`))
    .where(and(...intakeFilters(filters)))
    .orderBy(desc(students.createdAt), desc(students.studentId))
    .limit(Math.min(1000, Math.max(1, Number(filters.limit || 25))));

const intakeStudentJson = sql`json_build_object(
  'student_id', ${students.studentId},
  'center_id', ${students.centerId},
  'enrollment_number', ${students.enrollmentNumber},
  'first_name', ${students.firstName},
  'last_name', ${students.lastName},
  'phone', ${students.phone},
  'status', ${students.status},
  'class_id', ${students.classId},
  'class_name', ${classes.className},
  'class_code', ${classes.classCode},
  'teacher_id', ${teachers.teacherId},
  'teacher_first_name', ${teachers.firstName},
  'teacher_last_name', ${teachers.lastName},
  'created_at', ${students.createdAt},
  'deleted_at', ${students.createdAt}
)`;

const intakeStudentsByTeacherWithStudents = (filters: { centerId?: number; start?: string | null; end?: string | null; sourceId?: number; referredByTeacherId?: number; sourceDetail?: string } = {}) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      employee_id: teachers.employeeId,
      left_count: sql`COUNT(DISTINCT ${students.studentId})::int`,
      latest_deleted_at: sql`MAX(${students.createdAt})`,
      class_count: sql`COUNT(DISTINCT ${students.classId})::int`,
      students: sql`COALESCE(json_agg(${intakeStudentJson} ORDER BY ${students.createdAt} DESC) FILTER (WHERE ${students.studentId} IS NOT NULL), '[]'::json)`,
    })
    .from(teachers)
    .leftJoin(
      students,
      and(
        ...intakeFilters(filters),
        eq(sql`COALESCE((SELECT c.teacher_id FROM classes c WHERE c.class_id = ${students.classId}), ${students.teacherId})`, teachers.teacherId),
      ),
    )
    .leftJoin(classes, eq(classes.classId, students.classId))
    .where(and(isNull(teachers.deletedAt), ...scoped(teachers, filters.centerId)))
    .groupBy(teachers.teacherId, teachers.firstName, teachers.lastName, teachers.employeeId)
    .orderBy(desc(sql`COUNT(DISTINCT ${students.studentId})`), asc(teachers.firstName), asc(teachers.lastName));

// Students the center lost because of the teacher in the period, to call back: archived with a
// teacher reason, or moved out of the group with one (dated by the new group's start date). The
// group and teacher are the ones the child left.
const studentsLostToTeacher = async (filters: { centerId?: number; start: string; end: string }) => {
  const result = await pool.query(
    `SELECT * FROM (
       SELECT 'left' AS kind, s.student_id, s.first_name, s.last_name, s.phone, s.parent_phone,
              s.class_id, c.class_name, COALESCE(c.teacher_id, s.teacher_id) AS teacher_id,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
              s.deleted_at::date AS happened_on, r.reason_code, r.reason_name, s.delete_reason_note AS reason_note,
              NULL::text AS new_class_name
       FROM students s
       JOIN student_action_reasons r ON r.reason_id = s.delete_reason_id AND r.reason_type = 'delete' AND r.reason_code = ANY($4::text[])
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN teachers t ON t.teacher_id = COALESCE(c.teacher_id, s.teacher_id)
       WHERE s.deleted_at IS NOT NULL AND s.deleted_at::date BETWEEN $1::date AND $2::date
         AND ($3::int IS NULL OR s.center_id = $3)
       UNION ALL
       SELECT 'transferred' AS kind, s.student_id, s.first_name, s.last_name, s.phone, s.parent_phone,
              s.class_id, c.class_name, COALESCE(c.teacher_id, s.teacher_id) AS teacher_id,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
              moved.start_date AS happened_on, r.reason_code, r.reason_name, NULL::text AS reason_note,
              nc.class_name AS new_class_name
       FROM students s
       JOIN student_action_reasons r ON r.reason_id = s.transfer_reason_id AND r.reason_type = 'transfer' AND r.reason_code = ANY($5::text[])
       JOIN students moved ON moved.transferred_from_student_id = s.student_id
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN classes nc ON nc.class_id = moved.class_id
       LEFT JOIN teachers t ON t.teacher_id = COALESCE(c.teacher_id, s.teacher_id)
       WHERE s.status = 'Transferred' AND moved.start_date BETWEEN $1::date AND $2::date
         AND ($3::int IS NULL OR s.center_id = $3)
     ) lost
     ORDER BY happened_on DESC, student_id DESC`,
    [filters.start, filters.end, filters.centerId ?? null, TEACHER_FAULT_DELETE_REASONS, TEACHER_FAULT_TRANSFER_REASONS]
  );
  return result.rows;
};

module.exports = {
  studentsLostToTeacher,
  deletedStudentsByReason,
  countStudents,
  countTeachers,
  countClasses,
  sumPayments,
  sumDebts,
  paymentsByMonth,
  paymentsAggregate,
  attendanceByStatus,
  countDeletedStudents,
  deletedStudentsByMonth,
  deletedStudentsByTeacherWithStudents,
  deletedStudentsByClass,
  recentDeletedStudents,
  countIntakeStudents,
  intakeStudentsByMonth,
  intakeStudentsByTeacherWithStudents,
  intakeStudentsByClass,
  recentIntakeStudents,
};

export {};
