const { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, subjects, teachers } = require('../../../db/schema');

const db = pool.db;

const roomNumbersSql = sql`(
  SELECT STRING_AGG(DISTINCT assigned_rooms.room_number, ', ' ORDER BY assigned_rooms.room_number)
  FROM (
    SELECT r.room_number
    FROM rooms r
    WHERE r.class_id = classes.class_id
      AND r.center_id = classes.center_id
    UNION
    SELECT r.room_number
    FROM room_bookings rb
    JOIN room_slots rs ON rs.slot_id = rb.slot_id
    JOIN rooms r ON r.room_id = rs.room_id
    WHERE rb.class_id = classes.class_id
      AND rb.center_id = classes.center_id
  ) assigned_rooms
)`;

const roomAssignmentsSql = sql`(
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'room_id', assigned_rooms.room_id,
      'room_number', assigned_rooms.room_number,
      'day', assigned_rooms.day,
      'time', assigned_rooms.time,
      'end_time', assigned_rooms.end_time,
      'slot_date', assigned_rooms.slot_date
    )
    ORDER BY assigned_rooms.day, assigned_rooms.time, assigned_rooms.room_number
  )
  FROM (
    SELECT
      r.room_id,
      r.room_number,
      r.day,
      r.time,
      r.end_time,
      NULL::TEXT AS slot_date
    FROM rooms r
    WHERE r.class_id = classes.class_id
      AND r.center_id = classes.center_id
    UNION
    SELECT
      r.room_id,
      r.room_number,
      TRIM(TO_CHAR(rs.slot_date, 'Day')) AS day,
      rs.start_time AS time,
      rs.end_time,
      rs.slot_date::TEXT AS slot_date
    FROM room_bookings rb
    JOIN room_slots rs ON rs.slot_id = rb.slot_id
    JOIN rooms r ON r.room_id = rs.room_id
    WHERE rb.class_id = classes.class_id
      AND rb.center_id = classes.center_id
  ) assigned_rooms
)`;

const classSelection = (extra: Record<string, any> = {}) => ({
  class_id: classes.classId,
  center_id: classes.centerId,
  class_name: classes.className,
  class_code: classes.classCode,
  level: classes.level,
  section: classes.section,
  capacity: classes.capacity,
  teacher_id: classes.teacherId,
  room_number: sql`COALESCE(NULLIF(${classes.roomNumber}, ''), ${roomNumbersSql})`,
  total_students: classes.totalStudents,
  payment_amount: classes.paymentAmount,
  payment_frequency: classes.paymentFrequency,
  start_date: classes.startDate,
  end_date: classes.endDate,
  deleted_at: classes.deletedAt,
  created_at: classes.createdAt,
  updated_at: classes.updatedAt,
  subject_id: sql`(
    SELECT s.subject_id FROM subjects s
    WHERE s.class_id = classes.class_id
    ORDER BY s.subject_id ASC LIMIT 1
  )`,
  subject_name: sql`(
    SELECT s.subject_name FROM subjects s
    WHERE s.class_id = classes.class_id
    ORDER BY s.subject_id ASC LIMIT 1
  )`,
  room_assignments: roomAssignmentsSql,
  ...extra,
});

const scopeConditions = (centerId?: number, teacherId?: number, deleted = true) => {
  const conditions = deleted ? [isNull(classes.deletedAt)] : [];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  if (teacherId) conditions.push(eq(classes.teacherId, teacherId));
  return conditions;
};

const findAll = async (centerId?: number, teacherId?: number) => {
  const conditions = scopeConditions(centerId, teacherId);
  return db
    .select(classSelection())
    .from(classes)
    .where(and(...conditions))
    .orderBy(asc(classes.classId));
};

const findPaginated = async (filters: Record<string, any> = {}, centerId?: number, teacherId?: number) => {
  const conditions = scopeConditions(centerId, teacherId);

  if (filters.teacher_id != null) {
    conditions.push(eq(classes.teacherId, Number(filters.teacher_id)));
  }

  const search = String(filters.q || filters.search || '').trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(classes.className, pattern),
        ilike(classes.classCode, pattern),
        ilike(classes.section, pattern),
        ilike(classes.roomNumber, pattern),
      ),
    );
  }

  if (filters.level != null) {
    conditions.push(eq(classes.level, Number(filters.level)));
  }

  const where = and(...conditions);
  const countRows = await db.select({ total: sql`COUNT(*)::int` }).from(classes).where(where);
  const total = Number(countRows[0]?.total || 0);
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const offset = (page - 1) * limit;

  const data = await db
    .select(classSelection({
      student_count: sql`(
        SELECT COUNT(*)::int
        FROM students AS counted_students
        WHERE counted_students.class_id = classes.class_id
          AND counted_students.deleted_at IS NULL
      )`,
    }))
    .from(classes)
    .where(where)
    .orderBy(desc(classes.classId))
    .limit(limit)
    .offset(offset);

  return { data, total, page, limit };
};

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await db
    .select(classSelection())
    .from(classes)
    .where(and(eq(classes.classId, id), ...scopeConditions(centerId, teacherId)))
    .limit(1);
  return rows[0] || null;
};

const teacherExists = async (teacherId: number, centerId?: number) => {
  const conditions = [eq(teachers.teacherId, teacherId), isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  const rows = await db.select({ teacher_id: teachers.teacherId }).from(teachers).where(and(...conditions)).limit(1);
  return rows.length > 0;
};

const subjectCanAssign = async (subjectId: number, centerId: number) => {
  const rows = await db
    .select({ subject_id: subjects.subjectId })
    .from(subjects)
    .where(and(eq(subjects.subjectId, subjectId), eq(subjects.centerId, centerId)))
    .limit(1);
  return rows.length > 0;
};

const toTimestamp = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const insert = async (params: any[]) => {
  return db.transaction(async (tx: any) => {
    const rows = await tx.insert(classes).values({
      centerId: params[0],
      className: params[1],
      classCode: params[2],
      level: params[3],
      section: params[4],
      capacity: params[5],
      teacherId: params[6],
      roomNumber: params[7],
      startDate: toTimestamp(params[8]),
      endDate: toTimestamp(params[9]),
      paymentAmount: params[10],
      paymentFrequency: params[11],
    }).returning({ class_id: classes.classId });
    const classId = rows[0].class_id;
    const templates = await tx.select().from(subjects).where(and(eq(subjects.subjectId, params[12]), eq(subjects.centerId, params[0]))).limit(1);
    const template = templates[0];
    await tx.insert(subjects).values({
      centerId: params[0],
      classId,
      subjectName: template.subjectName,
      subjectCode: template.subjectCode,
      teacherId: params[6] || template.teacherId || null,
      totalMarks: template.totalMarks || 100,
      passingMarks: template.passingMarks || 40,
    });
    const created = await tx.select(classSelection()).from(classes).where(eq(classes.classId, classId)).limit(1);
    return created[0];
  });
};

const update = async (id: number, params: any[], centerId?: number) => {
  const conditions = [eq(classes.classId, id), isNull(classes.deletedAt)];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  const startDate = toTimestamp(params[7]);
  const endDate = toTimestamp(params[8]);
  const updates: Record<string, any> = {
    className: sql`COALESCE(${params[0] ?? null}, ${classes.className})`,
    classCode: sql`COALESCE(${params[1] ?? null}, ${classes.classCode})`,
    level: sql`COALESCE(${params[2] ?? null}, ${classes.level})`,
    section: sql`COALESCE(${params[3] ?? null}, ${classes.section})`,
    capacity: sql`COALESCE(${params[4] ?? null}, ${classes.capacity})`,
    teacherId: sql`COALESCE(${params[5] ?? null}, ${classes.teacherId})`,
    roomNumber: sql`COALESCE(${params[6] ?? null}, ${classes.roomNumber})`,
    paymentAmount: sql`COALESCE(${params[9] ?? null}, ${classes.paymentAmount})`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  };
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  const rows = await db
    .update(classes)
    .set(updates)
    .where(and(...conditions))
    .returning(classSelection());
  if (rows[0] && params[10] !== undefined) {
    const templates = await db.select().from(subjects).where(and(eq(subjects.subjectId, params[10]), eq(subjects.centerId, rows[0].center_id))).limit(1);
    const template = templates[0];
    const existing = await db.select({ subject_id: subjects.subjectId }).from(subjects).where(eq(subjects.classId, id)).limit(1);
    if (existing[0]) {
      await db.update(subjects).set({
        subjectName: template.subjectName,
        subjectCode: template.subjectCode,
        teacherId: params[5] ?? template.teacherId ?? undefined,
        totalMarks: template.totalMarks,
        passingMarks: template.passingMarks,
      }).where(eq(subjects.subjectId, existing[0].subject_id));
    } else {
      await db.insert(subjects).values({
        centerId: rows[0].center_id,
        classId: id,
        subjectName: template.subjectName,
        subjectCode: template.subjectCode,
        teacherId: params[5] || template.teacherId || null,
        totalMarks: template.totalMarks || 100,
        passingMarks: template.passingMarks || 40,
      });
    }
    const refreshed = await findById(id, centerId);
    return refreshed;
  }
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const conditions = [eq(classes.classId, id), isNull(classes.deletedAt)];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  const rows = await db
    .update(classes)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...conditions))
    .returning(classSelection());
  return rows[0] || null;
};

const purge = async (id: number, centerId?: number) => {
  const conditions = [eq(classes.classId, id), isNotNull(classes.deletedAt)];
  if (centerId) conditions.push(eq(classes.centerId, centerId));
  const rows = await db.delete(classes).where(and(...conditions)).returning(classSelection());
  return rows[0] || null;
};

module.exports = { findAll, findPaginated, findById, teacherExists, subjectCanAssign, insert, update, remove, purge };

export {};
