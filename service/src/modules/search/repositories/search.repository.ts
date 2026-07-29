const { and, desc, eq, ilike, isNull, or } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, payments, students, teachers } = require('../../../db/schema');

const db = pool.db;

const scoped = (table: any, centerId?: number, extra: any[] = []) => {
  const conditions = [isNull(table.deletedAt), ...extra];
  if (centerId) conditions.push(eq(table.centerId, centerId));
  return conditions;
};

const searchStudents = (pattern: string, max: number, centerId?: number, teacherId?: number) => {
  const extra = [
    or(
      ilike(students.firstName, pattern),
      ilike(students.lastName, pattern),
      ilike(students.enrollmentNumber, pattern),
      ilike(students.email, pattern),
      ilike(students.phone, pattern),
    ),
  ];
  if (teacherId) extra.push(eq(students.teacherId, teacherId));
  return db
    .select({
      student_id: students.studentId,
      first_name: students.firstName,
      last_name: students.lastName,
      enrollment_number: students.enrollmentNumber,
      email: students.email,
      phone: students.phone,
      class_id: students.classId,
    })
    .from(students)
    .where(and(...scoped(students, centerId, extra)))
    .orderBy(desc(students.studentId))
    .limit(max);
};

const searchTeachers = (pattern: string, max: number, centerId?: number) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      first_name: teachers.firstName,
      last_name: teachers.lastName,
      employee_id: teachers.employeeId,
      email: teachers.email,
      phone: teachers.phone,
    })
    .from(teachers)
    .where(and(...scoped(teachers, centerId, [or(ilike(teachers.firstName, pattern), ilike(teachers.lastName, pattern), ilike(teachers.employeeId, pattern), ilike(teachers.email, pattern), ilike(teachers.phone, pattern))])))
    .orderBy(desc(teachers.teacherId))
    .limit(max);

const searchClasses = (pattern: string, max: number, centerId?: number) =>
  db
    .select({
      class_id: classes.classId,
      class_name: classes.className,
      class_code: classes.classCode,
      level: classes.level,
      section: classes.section,
    })
    .from(classes)
    .where(and(...scoped(classes, centerId, [or(ilike(classes.className, pattern), ilike(classes.classCode, pattern))])))
    .orderBy(desc(classes.classId))
    .limit(max);

const searchPayments = (pattern: string, max: number, centerId?: number) => {
  const conditions = [
    isNull(payments.deletedAt),
    or(ilike(payments.receiptNumber, pattern), ilike(payments.paymentType, pattern)),
  ];
  if (centerId) conditions.push(eq(payments.centerId, centerId));
  return db
    .select({
      payment_id: payments.paymentId,
      student_id: payments.studentId,
      amount: payments.amount,
      payment_date: payments.paymentDate,
      payment_status: payments.paymentStatus,
      payment_type: payments.paymentType,
      receipt_number: payments.receiptNumber,
    })
    .from(payments)
    .where(and(...conditions))
    .orderBy(desc(payments.paymentId))
    .limit(max);
};

module.exports = { searchStudents, searchTeachers, searchClasses, searchPayments };

export {};
