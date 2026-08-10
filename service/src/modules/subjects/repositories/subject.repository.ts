const { and, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { subjects } = require('../../../db/schema');

const db = pool.db;

const selection = {
  subject_id: subjects.subjectId,
  center_id: subjects.centerId,
  class_id: subjects.classId,
  subject_name: subjects.subjectName,
  subject_code: subjects.subjectCode,
  teacher_id: subjects.teacherId,
  total_marks: subjects.totalMarks,
  passing_marks: subjects.passingMarks,
};

const findSubjects = (filters: { subjectId?: number; classId?: number } = {}, centerId?: number, teacherId?: number, byClass = false) => {
  const conditions: any[] = [];
  if (filters.subjectId) conditions.push(eq(subjects.subjectId, filters.subjectId));
  if (filters.classId) conditions.push(eq(subjects.classId, filters.classId));
  if (centerId) conditions.push(eq(subjects.centerId, centerId));
  if (teacherId) conditions.push(eq(subjects.teacherId, teacherId));

  let query = db.select(selection).from(subjects);
  if (conditions.length) query = query.where(and(...conditions));
  return byClass ? query.orderBy(subjects.subjectName) : query.orderBy(desc(subjects.subjectId));
};

const findAll = (centerId?: number, teacherId?: number) => findSubjects({}, centerId, teacherId);

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await findSubjects({ subjectId: id }, centerId, teacherId).limit(1);
  return rows[0] || null;
};

const findByClass = (classId: number, centerId?: number, teacherId?: number) =>
  findSubjects({ classId }, centerId, teacherId, true);

const insert = async (params: any[]) => {
  const rows = await db
    .insert(subjects)
    .values({
      centerId: params[0],
      classId: params[1],
      subjectName: params[2],
      subjectCode: params[3],
      teacherId: params[4],
      totalMarks: params[5],
      passingMarks: params[6],
    })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, params: any[], centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(subjects)
    .set({
      classId: sql`COALESCE(${params[0] ?? null}, ${subjects.classId})`,
      subjectName: sql`COALESCE(${params[1] ?? null}, ${subjects.subjectName})`,
      subjectCode: sql`COALESCE(${params[2] ?? null}, ${subjects.subjectCode})`,
      teacherId: sql`COALESCE(${params[3] ?? null}, ${subjects.teacherId})`,
      totalMarks: sql`COALESCE(${params[4] ?? null}, ${subjects.totalMarks})`,
      passingMarks: sql`COALESCE(${params[5] ?? null}, ${subjects.passingMarks})`,
    })
    .where(eq(subjects.subjectId, id))
    .returning(selection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db.delete(subjects).where(eq(subjects.subjectId, id)).returning(selection);
  return rows[0] || null;
};

module.exports = { findAll, findById, findByClass, insert, update, remove };

export {};
