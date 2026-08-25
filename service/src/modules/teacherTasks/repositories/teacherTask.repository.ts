const { and, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { teacherTasks } = require('../../../db/schema');

type TeacherTaskListOptions = {
  centerId?: number;
  teacherId?: number;
  adminId?: number;
  status?: string;
  limit?: number;
  offset?: number;
};

const db = pool.db;

const selection = {
  task_id: teacherTasks.taskId,
  center_id: teacherTasks.centerId,
  teacher_id: teacherTasks.teacherId,
  admin_id: teacherTasks.adminId,
  assignee_type: teacherTasks.assigneeType,
  created_by: teacherTasks.createdBy,
  task_title: teacherTasks.taskTitle,
  task_definition: teacherTasks.taskDefinition,
  deadline: teacherTasks.deadline,
  status: teacherTasks.status,
  status_note: teacherTasks.statusNote,
  created_at: teacherTasks.createdAt,
  updated_at: teacherTasks.updatedAt,
};

const scopedConditions = (options: TeacherTaskListOptions = {}) => {
  const conditions: any[] = [];
  if (options.centerId) conditions.push(eq(teacherTasks.centerId, options.centerId));
  if (options.teacherId) conditions.push(eq(teacherTasks.teacherId, options.teacherId));
  if (options.adminId) conditions.push(eq(teacherTasks.adminId, options.adminId));
  if (options.status) conditions.push(eq(teacherTasks.status, options.status));
  return conditions;
};

const getAll = (options: TeacherTaskListOptions = {}) => {
  const conditions = scopedConditions(options);
  let query = db.select(selection).from(teacherTasks);
  if (conditions.length) query = query.where(and(...conditions));
  query = query.orderBy(desc(teacherTasks.taskId));
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.offset(options.offset);
  return query;
};

const getById = async (id: number, centerId?: number, teacherId?: number, adminId?: number) => {
  const conditions = [eq(teacherTasks.taskId, id), ...scopedConditions({ centerId, teacherId, adminId })];
  const rows = await db.select(selection).from(teacherTasks).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const create = async (payload: any) => {
  const isAdmin = payload.assignee_type === 'admin';
  const rows = await db
    .insert(teacherTasks)
    .values({
      assigneeType: payload.assignee_type,
      teacherId: isAdmin ? null : payload.teacher_id,
      adminId: isAdmin ? payload.admin_id : null,
      centerId: payload.center_id ?? null,
      createdBy: payload.created_by ?? null,
      taskTitle: payload.task_title,
      taskDefinition: payload.task_definition ?? null,
      deadline: payload.deadline ?? null,
      status: 'pending',
      statusNote: null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, payload: any, centerId?: number) => {
  const existing = await getById(id, centerId);
  if (!existing) return null;

  const setValues: any = {
    taskTitle: sql`COALESCE(${payload.task_title ?? null}, ${teacherTasks.taskTitle})`,
    taskDefinition: sql`COALESCE(${payload.task_definition ?? null}, ${teacherTasks.taskDefinition})`,
    deadline: sql`COALESCE(${payload.deadline ?? null}, ${teacherTasks.deadline})`,
    updatedAt: sql`CURRENT_TIMESTAMP`,
  };

  if (payload.assignee_type) {
    const isAdmin = payload.assignee_type === 'admin';
    setValues.assigneeType = payload.assignee_type;
    setValues.teacherId = isAdmin ? null : payload.teacher_id ?? null;
    setValues.adminId = isAdmin ? payload.admin_id ?? null : null;
  }

  const rows = await db
    .update(teacherTasks)
    .set(setValues)
    .where(eq(teacherTasks.taskId, id))
    .returning(selection);
  return rows[0] || null;
};

const updateStatus = async (
  id: number,
  patch: { status: string; statusNote?: string | null },
  scope: { centerId?: number } = {}
) => {
  const existing = await getById(id, scope.centerId);
  if (!existing) return null;
  const rows = await db
    .update(teacherTasks)
    .set({
      status: patch.status,
      statusNote: patch.statusNote ?? null,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(teacherTasks.taskId, id))
    .returning(selection);
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const existing = await getById(id, centerId);
  if (!existing) return null;
  const rows = await db.delete(teacherTasks).where(eq(teacherTasks.taskId, id)).returning(selection);
  return rows[0] || null;
};

const getStats = (options: { centerId?: number; teacherId?: number; adminId?: number } = {}) => {
  const conditions = scopedConditions(options);
  let query = db
    .select({ status: teacherTasks.status, count: sql`count(*)::int` })
    .from(teacherTasks);
  if (conditions.length) query = query.where(and(...conditions));
  return query.groupBy(teacherTasks.status);
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  updateStatus,
  remove,
  getStats,
};

export {};
