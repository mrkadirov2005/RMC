const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { attendance, classes, students } = require('../../../db/schema');

const db = pool.db;

const selection = {
  attendance_id: attendance.attendanceId,
  center_id: attendance.centerId,
  student_id: attendance.studentId,
  teacher_id: attendance.teacherId,
  class_id: attendance.classId,
  session_id: attendance.sessionId,
  attendance_date: attendance.attendanceDate,
  status: attendance.status,
  notes: attendance.notes,
  remarks: attendance.remarks,
  created_at: attendance.createdAt,
  updated_at: attendance.updatedAt,
};

const scope = (centerId?: number, teacherId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(classes.centerId, centerId), isNull(classes.deletedAt));
  if (teacherId) conditions.push(eq(attendance.teacherId, teacherId));
  return conditions;
};

const queryAttendance = (conditions: any[], centerId?: number, orderBy: any = desc(attendance.attendanceId)) => {
  let query = db.select(selection).from(attendance);
  if (centerId) query = query.innerJoin(classes, eq(classes.classId, attendance.classId));
  return query.where(and(...conditions)).orderBy(orderBy);
};

const findAll = (centerId?: number, teacherId?: number) =>
  queryAttendance(scope(centerId, teacherId), centerId, desc(attendance.attendanceId));

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await queryAttendance([eq(attendance.attendanceId, id), ...scope(centerId, teacherId)], centerId).limit(1);
  return rows[0] || null;
};

const insert = async (params: any[]) => {
  const payload = {
    centerId: params[0],
    studentId: params[1],
    teacherId: params[2],
    classId: params[3],
    sessionId: params[4] || null,
    attendanceDate: params[5],
    status: params[6],
    remarks: params[7],
  };

  const existingConditions = payload.sessionId
    ? [eq(attendance.studentId, payload.studentId), eq(attendance.sessionId, payload.sessionId)]
    : [eq(attendance.studentId, payload.studentId), eq(attendance.classId, payload.classId), eq(attendance.attendanceDate, payload.attendanceDate), isNull(attendance.sessionId)];

  const existing = await db.select({ attendance_id: attendance.attendanceId }).from(attendance).where(and(...existingConditions)).limit(1);
  if (existing[0]) {
    const rows = await db
      .update(attendance)
      .set({ ...payload, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(attendance.attendanceId, existing[0].attendance_id))
      .returning(selection);
    return rows[0];
  }

  const rows = await db.insert(attendance).values(payload).returning(selection);
  return rows[0];
};

const update = async (id: number, params: any[], centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(attendance)
    .set({
      status: sql`COALESCE(${params[0] ?? null}, ${attendance.status})`,
      remarks: sql`COALESCE(${params[1] ?? null}, ${attendance.remarks})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(attendance.attendanceId, id))
    .returning(selection);
  return rows[0] || null;
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  queryAttendance([eq(attendance.studentId, studentId), ...scope(centerId, teacherId)], centerId, desc(attendance.attendanceDate));

const findByClass = (classId: number, centerId?: number, teacherId?: number) =>
  queryAttendance([eq(attendance.classId, classId), ...scope(centerId, teacherId)], centerId, desc(attendance.attendanceDate));

const findBySession = (sessionId: number, centerId?: number, teacherId?: number) =>
  queryAttendance([eq(attendance.sessionId, sessionId), ...scope(centerId, teacherId)], centerId);

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db.delete(attendance).where(eq(attendance.attendanceId, id)).returning(selection);
  return rows[0] || null;
};

const removeByClass = async (classId: number, centerId?: number) => {
  const conditions = [eq(attendance.classId, classId)];
  if (centerId) conditions.push(eq(attendance.centerId, centerId));
  const rows = await db.delete(attendance).where(and(...conditions)).returning({ attendance_id: attendance.attendanceId });
  return rows.length;
};

const studentInCenter = async (studentId: number, centerId: number) => {
  const rows = await db
    .select({ student_id: students.studentId })
    .from(students)
    .where(and(eq(students.studentId, studentId), eq(students.centerId, centerId), isNull(students.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

const classInCenter = async (classId: number, centerId: number) => {
  const rows = await db
    .select({ class_id: classes.classId })
    .from(classes)
    .where(and(eq(classes.classId, classId), eq(classes.centerId, centerId), isNull(classes.deletedAt)))
    .limit(1);
  return rows.length > 0;
};

module.exports = {
  findAll,
  findById,
  insert,
  update,
  findByStudent,
  findByClass,
  findBySession,
  remove,
  removeByClass,
  studentInCenter,
  classInCenter,
};

export {};
