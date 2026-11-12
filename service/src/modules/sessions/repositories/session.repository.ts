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
  status: sql<string>`'Scheduled'`,
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

/**
 * A group's start and end dates as plain YYYY-MM-DD text. Read this way because the columns are
 * dates in the database but timestamps in the schema, and that mapping turned them into Invalid
 * Date, so generating lessons skipped every day for a group with a start date.
 */
const findClassDates = async (classId: number) => {
  const result = await pool.query(
    `SELECT start_date::date::text AS start_date, end_date::date::text AS end_date FROM classes WHERE class_id = $1`,
    [classId],
  );
  return { start: result.rows[0]?.start_date || null, end: result.rows[0]?.end_date || null };
};

/**
 * Future lessons of a group from `fromDate` on that do not fit its timetable (another weekday or
 * start time, or outside the group's dates) and that nobody has scored or taken attendance for.
 * Lessons that already fit stay as they are, as do scored lessons and lessons moved by an
 * approved reschedule.
 */
const deleteOffTimetableFrom = async (
  classId: number,
  fromDate: string,
  timetable: { days: string[]; time: string; start: string | null; end: string | null },
  centerId?: number,
  teacherId?: number,
) => {
  const days = timetable.days.map((day) => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
  const rows = await db
    .update(sessions)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(
      eq(sessions.classId, classId),
      gte(sessions.sessionDate, fromDate),
      isNull(sessions.deletedAt),
      ...scoped(centerId, teacherId),
      sql`NOT (
        to_char("sessions"."session_date", 'FMDay') = ANY(string_to_array(${days.join(',')}, ','))
        AND substring("sessions"."start_time"::text, 1, 5) = ${timetable.time.slice(0, 5)}
        AND (${timetable.start}::date IS NULL OR "sessions"."session_date" >= ${timetable.start}::date)
        AND (${timetable.end}::date IS NULL OR "sessions"."session_date" <= ${timetable.end}::date)
      )`,
      sql`NOT EXISTS (SELECT 1 FROM grades g WHERE g.session_id = "sessions"."session_id")`,
      sql`NOT EXISTS (SELECT 1 FROM attendance a WHERE a.session_id = "sessions"."session_id")`,
      sql`NOT EXISTS (SELECT 1 FROM lesson_reschedules r WHERE r.class_id = "sessions"."class_id" AND r.new_date = "sessions"."session_date" AND r.status = 'approved')`,
    ))
    .returning({ session_id: sessions.sessionId });
  return { deleted: rows.length };
};

const updateTime = async (
  classId: number,
  sessionId: number,
  fields: { start_time: string; end_time: string; duration_minutes: number },
  centerId?: number,
  teacherId?: number
) => {
  const rows = await db
    .update(sessions)
    .set({
      startTime: fields.start_time,
      endTime: fields.end_time,
      durationMinutes: fields.duration_minutes,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(sessions.sessionId, sessionId), eq(sessions.classId, classId), isNull(sessions.deletedAt), ...scoped(centerId, teacherId)))
    .returning(selection);
  return rows[0];
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

module.exports = {
  findClassDates,
  deleteOffTimetableFrom, create, bulkInsert, findByClass, findByClasses, deleteUpcoming, updateTime, deleteById, softDeleteByClass, purgeById };

export {};
