const { and, asc, desc, eq, gte, isNotNull, isNull, lte, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { attendance, classes, debts, payments, students, teachers } = require('../../../db/schema');

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

const retentionDeletedFilters = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) => {
  const conditions: any[] = [isNotNull(students.deletedAt)];
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

const deletedStudentsByTeacher = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
      employee_id: teachers.employeeId,
      left_count: sql`COUNT(DISTINCT ${students.studentId})::int`,
      latest_deleted_at: sql`MAX(${students.deletedAt})`,
      class_count: sql`COUNT(DISTINCT ${students.classId})::int`,
    })
    .from(teachers)
    .leftJoin(
      students,
      and(
        ...retentionDeletedFilters(filters),
        eq(sql`COALESCE((SELECT c.teacher_id FROM classes c WHERE c.class_id = ${students.classId}), ${students.teacherId})`, teachers.teacherId),
      ),
    )
    .where(and(isNull(teachers.deletedAt), ...scoped(teachers, filters.centerId)))
    .groupBy(teachers.teacherId, teachers.firstName, teachers.lastName, teachers.employeeId)
    .orderBy(desc(sql`COUNT(DISTINCT ${students.studentId})`), asc(teachers.firstName), asc(teachers.lastName));

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
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sql`COALESCE(${classes.teacherId}, ${students.teacherId})`))
    .where(and(...retentionDeletedFilters(filters)))
    .orderBy(desc(students.deletedAt), desc(students.studentId))
    .limit(Math.min(100, Math.max(1, Number(filters.limit || 25))));

const intakeFilters = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) => {
  const conditions: any[] = [];
  if (filters.centerId) conditions.push(eq(students.centerId, filters.centerId));
  if (filters.start) conditions.push(gte(sql`${students.createdAt}::date`, filters.start));
  if (filters.end) conditions.push(lte(sql`${students.createdAt}::date`, filters.end));
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

const intakeStudentsByTeacher = (filters: { centerId?: number; start?: string | null; end?: string | null } = {}) =>
  db.select({
    teacher_id: teachers.teacherId,
    teacher_first_name: teachers.firstName,
    teacher_last_name: teachers.lastName,
    employee_id: teachers.employeeId,
    left_count: sql`COUNT(DISTINCT ${students.studentId})::int`,
    latest_deleted_at: sql`MAX(${students.createdAt})`,
    class_count: sql`COUNT(DISTINCT ${students.classId})::int`,
  }).from(teachers)
    .leftJoin(students, and(...intakeFilters(filters), eq(sql`COALESCE((SELECT c.teacher_id FROM classes c WHERE c.class_id = ${students.classId}), ${students.teacherId})`, teachers.teacherId)))
    .where(and(isNull(teachers.deletedAt), ...scoped(teachers, filters.centerId)))
    .groupBy(teachers.teacherId, teachers.firstName, teachers.lastName, teachers.employeeId)
    .orderBy(desc(sql`COUNT(DISTINCT ${students.studentId})`), asc(teachers.firstName), asc(teachers.lastName));

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

module.exports = {
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
  deletedStudentsByTeacher,
  deletedStudentsByClass,
  recentDeletedStudents,
  countIntakeStudents,
  intakeStudentsByMonth,
  intakeStudentsByTeacher,
  intakeStudentsByClass,
  recentIntakeStudents,
};

export {};
