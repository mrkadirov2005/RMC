const { and, asc, eq, gte, inArray, isNotNull, isNull, lte, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { sessions } = require('../../../db/schema');

const db = pool.db;

const selection = {
  session_id: sessions.sessionId,
  center_id: sessions.centerId,
  class_id: sessions.classId,
  teacher_id: sessions.teacherId,
  session_date: sessions.sessionDate,
  start_time: sessions.startTime,
  duration_minutes: sessions.durationMinutes,
  end_time: sessions.endTime,
  status: sessions.status,
  deleted_at: sessions.deletedAt,
  created_at: sessions.createdAt,
  updated_at: sessions.updatedAt,
};

const scoped = (centerId?: number, teacherId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(sessions.centerId, centerId));
  if (teacherId) conditions.push(eq(sessions.teacherId, teacherId));
  return conditions;
};

const create = async (row: any) => {
  const existing = await db
    .select({ session_id: sessions.sessionId })
    .from(sessions)
    .where(and(eq(sessions.classId, row.class_id), eq(sessions.sessionDate, row.session_date), eq(sessions.startTime, row.start_time), isNull(sessions.deletedAt)))
    .limit(1);

  if (existing[0]) {
    const rows = await db
      .update(sessions)
      .set({
        teacherId: row.teacher_id,
        durationMinutes: row.duration_minutes,
        endTime: row.end_time,
        centerId: row.center_id,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(sessions.sessionId, existing[0].session_id))
      .returning(selection);
    return rows[0];
  }

  const rows = await db
    .insert(sessions)
    .values({
      centerId: row.center_id,
      classId: row.class_id,
      teacherId: row.teacher_id,
      sessionDate: row.session_date,
      startTime: row.start_time,
      durationMinutes: row.duration_minutes,
      endTime: row.end_time,
    })
    .returning(selection);
  return rows[0];
};

const bulkInsert = async (rows: any[]) => {
  if (rows.length === 0) return { created: 0 };
  let created = 0;
  await db.transaction(async (tx: any) => {
    for (const row of rows) {
      const existing = await tx
        .select({ session_id: sessions.sessionId })
        .from(sessions)
        .where(and(eq(sessions.classId, row.class_id), eq(sessions.sessionDate, row.session_date), eq(sessions.startTime, row.start_time), isNull(sessions.deletedAt)))
        .limit(1);
      if (existing[0]) continue;
      await tx.insert(sessions).values({
        centerId: row.center_id,
        classId: row.class_id,
        teacherId: row.teacher_id,
        sessionDate: row.session_date,
        startTime: row.start_time,
        durationMinutes: row.duration_minutes,
        endTime: row.end_time,
      });
      created += 1;
    }
  });
  return { created };
};

const findByClass = (classId: number, centerId?: number, teacherId?: number) =>
  db
    .select(selection)
    .from(sessions)
    .where(and(eq(sessions.classId, classId), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .orderBy(asc(sessions.sessionDate), asc(sessions.startTime));

const findByClasses = (classIds: number[], centerId?: number, teacherId?: number) => {
  const uniqueClassIds = Array.from(new Set(classIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueClassIds.length === 0) return [];
  return db
    .select(selection)
    .from(sessions)
    .where(and(inArray(sessions.classId, uniqueClassIds), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .orderBy(asc(sessions.sessionDate), asc(sessions.startTime));
};

const deleteUpcoming = async (classId: number, fromDate: string, toDate?: string, centerId?: number, teacherId?: number) => {
  const conditions = [eq(sessions.classId, classId), gte(sessions.sessionDate, fromDate), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)];
  if (toDate) conditions.push(lte(sessions.sessionDate, toDate));
  const rows = await db
    .update(sessions)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning({ session_id: sessions.sessionId });
  return { deleted: rows.length };
};

const deleteById = async (classId: number, sessionId: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .update(sessions)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.classId, classId), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .returning({ session_id: sessions.sessionId });
  return { deleted: rows.length };
};

const softDeleteByClass = async (classId: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .update(sessions)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(sessions.classId, classId), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .returning({ session_id: sessions.sessionId });
  return rows.length;
};

const purgeById = async (classId: number, sessionId: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .delete(sessions)
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.classId, classId), isNotNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .returning({ session_id: sessions.sessionId });
  return { deleted: rows.length };
};

module.exports = { create, bulkInsert, findByClass, findByClasses, deleteUpcoming, deleteById, softDeleteByClass, purgeById };

export {};
