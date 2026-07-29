const { and, desc, eq, isNotNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, payments, sessions, students, teachers } = require('../../../db/schema');

const db = pool.db;

const center = (table: any, centerId?: number) => (centerId ? [eq(table.centerId, centerId)] : []);

const findArchivedStudents = (centerId?: number) =>
  db
    .select({
      student_id: students.studentId,
      center_id: students.centerId,
      enrollment_number: students.enrollmentNumber,
      first_name: students.firstName,
      last_name: students.lastName,
      email: students.email,
      phone: students.phone,
      status: students.status,
      teacher_id: students.teacherId,
      class_id: students.classId,
      deleted_at: students.deletedAt,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(teachers, eq(teachers.teacherId, students.teacherId))
    .where(and(isNotNull(students.deletedAt), ...center(students, centerId)))
    .orderBy(desc(students.deletedAt), desc(students.studentId));

const findArchivedTeachers = (centerId?: number) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      center_id: teachers.centerId,
      employee_id: teachers.employeeId,
      first_name: teachers.firstName,
      last_name: teachers.lastName,
      email: teachers.email,
      phone: teachers.phone,
      status: teachers.status,
      deleted_at: teachers.deletedAt,
    })
    .from(teachers)
    .where(and(isNotNull(teachers.deletedAt), ...center(teachers, centerId)))
    .orderBy(desc(teachers.deletedAt), desc(teachers.teacherId));

const findArchivedClasses = (centerId?: number) =>
  db
    .select({
      class_id: classes.classId,
      center_id: classes.centerId,
      class_name: classes.className,
      class_code: classes.classCode,
      level: classes.level,
      capacity: classes.capacity,
      teacher_id: classes.teacherId,
      room_number: classes.roomNumber,
      payment_amount: classes.paymentAmount,
      payment_frequency: classes.paymentFrequency,
      deleted_at: classes.deletedAt,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
    })
    .from(classes)
    .leftJoin(teachers, eq(teachers.teacherId, classes.teacherId))
    .where(and(isNotNull(classes.deletedAt), ...center(classes, centerId)))
    .orderBy(desc(classes.deletedAt), desc(classes.classId));

const findArchivedPayments = (centerId?: number) =>
  db
    .select({
      payment_id: payments.paymentId,
      student_id: payments.studentId,
      center_id: payments.centerId,
      payment_date: payments.paymentDate,
      amount: payments.amount,
      currency: payments.currency,
      payment_method: payments.paymentMethod,
      receipt_number: payments.receiptNumber,
      payment_status: payments.paymentStatus,
      payment_type: payments.paymentType,
      deleted_at: payments.deletedAt,
      student_first_name: students.firstName,
      student_last_name: students.lastName,
      enrollment_number: students.enrollmentNumber,
    })
    .from(payments)
    .leftJoin(students, eq(students.studentId, payments.studentId))
    .where(and(isNotNull(payments.deletedAt), ...center(payments, centerId)))
    .orderBy(desc(payments.deletedAt), desc(payments.paymentId));

const findArchivedSessions = (centerId?: number) =>
  db
    .select({
      session_id: sessions.sessionId,
      center_id: sessions.centerId,
      class_id: sessions.classId,
      teacher_id: sessions.teacherId,
      session_date: sessions.sessionDate,
      start_time: sessions.startTime,
      duration_minutes: sessions.durationMinutes,
      end_time: sessions.endTime,
      deleted_at: sessions.deletedAt,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
    })
    .from(sessions)
    .leftJoin(classes, eq(classes.classId, sessions.classId))
    .leftJoin(teachers, eq(teachers.teacherId, sessions.teacherId))
    .where(and(isNotNull(sessions.deletedAt), ...center(sessions, centerId)))
    .orderBy(desc(sessions.deletedAt), desc(sessions.sessionId));

const entityMap: Record<string, { table: any; pk: any; status?: string }> = {
  students: { table: students, pk: students.studentId, status: 'Active' },
  teachers: { table: teachers, pk: teachers.teacherId, status: 'Active' },
  classes: { table: classes, pk: classes.classId },
  payments: { table: payments, pk: payments.paymentId },
  sessions: { table: sessions, pk: sessions.sessionId },
};

const restoreArchived = async (entity: string, id: number, centerId?: number) => {
  const config = entityMap[entity];
  if (!config) return { error: 'invalid_entity' as const };
  const conditions = [eq(config.pk, id), isNotNull(config.table.deletedAt)];
  if (centerId) conditions.push(eq(config.table.centerId, centerId));
  const setData: any = { deletedAt: null, updatedAt: sql`CURRENT_TIMESTAMP` };
  if (config.status) setData.status = config.status;
  const rows = await db.update(config.table).set(setData).where(and(...conditions)).returning();
  return { row: rows[0] || null };
};

const purgeArchived = async (entity: string, id: number, centerId?: number) => {
  const config = entityMap[entity];
  if (!config) return { error: 'invalid_entity' as const };
  const conditions = [eq(config.pk, id), isNotNull(config.table.deletedAt)];
  if (centerId) conditions.push(eq(config.table.centerId, centerId));
  const rows = await db.delete(config.table).where(and(...conditions)).returning();
  return { row: rows[0] || null };
};

module.exports = {
  findArchivedStudents,
  findArchivedTeachers,
  findArchivedClasses,
  findArchivedPayments,
  findArchivedSessions,
  restoreArchived,
  purgeArchived,
};

export {};
