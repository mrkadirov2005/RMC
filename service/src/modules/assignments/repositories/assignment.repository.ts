const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { assignments, classes } = require('../../../db/schema');

type AssignmentListOptions = {
  centerId?: number;
  teacherId?: number;
  classId?: number;
  limit?: number;
  offset?: number;
};

const db = pool.db;

const selection = {
  assignment_id: assignments.assignmentId,
  center_id: assignments.centerId,
  class_id: assignments.classId,
  subject_id: assignments.subjectId,
  student_id: assignments.studentId,
  teacher_id: assignments.teacherId,
  assignment_title: assignments.assignmentTitle,
  title: assignments.title,
  description: assignments.description,
  due_date: assignments.dueDate,
  submission_date: assignments.submissionDate,
  status: assignments.status,
  grade: assignments.grade,
  deleted_at: assignments.deletedAt,
  created_at: assignments.createdAt,
  updated_at: assignments.updatedAt,
};

const scopedConditions = (options: AssignmentListOptions = {}) => {
  const conditions: any[] = [];
  if (options.centerId) conditions.push(eq(assignments.centerId, options.centerId));
  if (options.teacherId) conditions.push(eq(classes.teacherId, options.teacherId), isNull(classes.deletedAt));
  if (options.classId) conditions.push(eq(assignments.classId, options.classId));
  return conditions;
};

const scopedQuery = (conditions: any[], teacherId?: number) => {
  let query = db.select(selection).from(assignments);
  if (teacherId) query = query.innerJoin(classes, eq(classes.classId, assignments.classId));
  if (conditions.length) query = query.where(and(...conditions));
  return query;
};

const getAll = (options: AssignmentListOptions = {}) => {
  let query = scopedQuery(scopedConditions(options), options.teacherId).orderBy(desc(assignments.assignmentId));
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.offset(options.offset);
  return query;
};

const getById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await scopedQuery([eq(assignments.assignmentId, id), ...scopedConditions({ centerId, teacherId })], teacherId).limit(1);
  return rows[0] || null;
};

const create = async (payload: any) => {
  const rows = await db
    .insert(assignments)
    .values({
      classId: payload.class_id ?? null,
      assignmentTitle: payload.assignment_title,
      description: payload.description,
      dueDate: payload.due_date,
      submissionDate: payload.submission_date,
      status: payload.status || 'Pending',
      grade: payload.grade,
      studentId: payload.student_id,
      teacherId: payload.teacher_id,
      centerId: payload.center_id,
    })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, payload: any, centerId?: number, teacherId?: number) => {
  const existing = await getById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(assignments)
    .set({
      assignmentTitle: sql`COALESCE(${payload.assignment_title ?? null}, ${assignments.assignmentTitle})`,
      description: sql`COALESCE(${payload.description ?? null}, ${assignments.description})`,
      dueDate: sql`COALESCE(${payload.due_date ?? null}, ${assignments.dueDate})`,
      status: sql`COALESCE(${payload.status ?? null}, ${assignments.status})`,
      grade: sql`COALESCE(${payload.grade ?? null}, ${assignments.grade})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(assignments.assignmentId, id))
    .returning(selection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await getById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db.delete(assignments).where(eq(assignments.assignmentId, id)).returning(selection);
  return rows[0] || null;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

export {};
