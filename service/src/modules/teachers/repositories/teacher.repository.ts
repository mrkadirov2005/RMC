const { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const {
  assignments,
  attendance,
  classes,
  grades,
  sessions,
  students,
  subjects,
  teachers,
} = require('../../../db/schema');

const db = pool.db;

const parseJson = (value: any) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const teacherSelection = {
  teacher_id: teachers.teacherId,
  center_id: teachers.centerId,
  employee_id: teachers.employeeId,
  first_name: teachers.firstName,
  last_name: teachers.lastName,
  email: teachers.email,
  phone: teachers.phone,
  date_of_birth: teachers.dateOfBirth,
  gender: teachers.gender,
  qualification: teachers.qualification,
  specialization: teachers.specialization,
  salary_percentage: teachers.salaryPercentage,
  status: teachers.status,
  roles: teachers.roles,
  username: teachers.username,
  password_hash: teachers.passwordHash,
  deleted_at: teachers.deletedAt,
  created_at: teachers.createdAt,
  updated_at: teachers.updatedAt,
};

const teacherListSelection = {
  ...teacherSelection,
  student_count: sql`
    COALESCE((
      SELECT COUNT(DISTINCT counted_students.student_id)::int
      FROM students AS counted_students
      WHERE counted_students.deleted_at IS NULL
        AND counted_students.center_id = teachers.center_id
        AND (
          counted_students.teacher_id = teachers.teacher_id
          OR EXISTS (
            SELECT 1
            FROM classes AS assigned_class
            WHERE assigned_class.class_id = counted_students.class_id
              AND assigned_class.center_id = teachers.center_id
              AND assigned_class.teacher_id = teachers.teacher_id
              AND assigned_class.deleted_at IS NULL
          )
        )
    ), 0)::int
  `,
  class_count: sql`
    COALESCE((
      SELECT COUNT(*)::int
      FROM classes AS teacher_classes
      WHERE teacher_classes.deleted_at IS NULL
        AND teacher_classes.teacher_id = teachers.teacher_id
    ), 0)::int
  `,
};

const scopedTeacherConditions = (id?: number, centerId?: number, includeDeleted = false) => {
  const conditions: any[] = [];
  if (id !== undefined) conditions.push(eq(teachers.teacherId, id));
  if (!includeDeleted) conditions.push(isNull(teachers.deletedAt));
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  return conditions;
};

const buildListConditions = (filters: Record<string, any> = {}, centerId?: number) => {
  const conditions: any[] = [isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));

  const search = String(filters.q || filters.search || '').trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(teachers.firstName, pattern),
        ilike(teachers.lastName, pattern),
        ilike(sql`CONCAT_WS(' ', ${teachers.firstName}, ${teachers.lastName})`, pattern),
        ilike(teachers.employeeId, pattern),
        ilike(teachers.specialization, pattern),
        ilike(teachers.qualification, pattern),
        ilike(teachers.email, pattern),
        ilike(teachers.phone, pattern),
        ilike(teachers.username, pattern),
        ilike(teachers.status, pattern)
      )
    );
  }

  const status = String(filters.status || '').trim();
  if (status) conditions.push(eq(teachers.status, status));
  return conditions;
};

const findAll = (centerId?: number) =>
  db
    .select(teacherListSelection)
    .from(teachers)
    .where(and(...buildListConditions({}, centerId)))
    .orderBy(asc(teachers.teacherId));

const findPaginated = async (filters: Record<string, any> = {}, centerId?: number) => {
  const conditions = buildListConditions(filters, centerId);
  const [countRows, rows] = await Promise.all([
    db.select({ total: sql`COUNT(*)::int` }).from(teachers).where(and(...conditions)),
    db
      .select(teacherListSelection)
      .from(teachers)
      .where(and(...conditions))
      .orderBy(desc(teachers.teacherId))
      .limit(Math.min(100, Math.max(1, Number(filters.limit || 20))))
      .offset((Math.max(1, Number(filters.page || 1)) - 1) * Math.min(100, Math.max(1, Number(filters.limit || 20)))),
  ]);
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  return { data: rows, total: Number((countRows[0] as any)?.total || 0), page, limit };
};

const findById = (id: number, centerId?: number) =>
  db
    .select(teacherSelection)
    .from(teachers)
    .where(and(...scopedTeacherConditions(id, centerId)))
    .then((rows: any[]) => rows[0] || null);

const findByUsername = (username: string) =>
  db
    .select({
      teacher_id: teachers.teacherId,
      first_name: teachers.firstName,
      last_name: teachers.lastName,
      email: teachers.email,
      password_hash: teachers.passwordHash,
      status: teachers.status,
      center_id: teachers.centerId,
    })
    .from(teachers)
    .where(and(eq(teachers.username, username), isNull(teachers.deletedAt)))
    .then((rows: any[]) => rows[0] || null);

const insert = (params: any[]) =>
  db
    .insert(teachers)
    .values({
      centerId: params[0],
      employeeId: params[1],
      firstName: params[2],
      lastName: params[3],
      email: params[4],
      phone: params[5],
      dateOfBirth: params[6],
      gender: params[7],
      qualification: params[8],
      specialization: params[9],
      salaryPercentage: params[10],
      status: params[11],
      roles: parseJson(params[12]),
      username: params[13],
      passwordHash: params[14],
    })
    .returning(teacherSelection)
    .then((rows: any[]) => rows[0]);

const countByUsername = (username: string) =>
  db
    .select({ count: sql`COUNT(*)::int` })
    .from(teachers)
    .where(and(eq(teachers.username, username), isNull(teachers.deletedAt)))
    .then((rows: any[]) => Number(rows[0]?.count || 0));

const countByEmployeeId = (employeeId: string) =>
  db
    .select({ count: sql`COUNT(*)::int` })
    .from(teachers)
    .where(and(eq(teachers.employeeId, employeeId), isNull(teachers.deletedAt)))
    .then((rows: any[]) => Number(rows[0]?.count || 0));

const countByEmail = (email: string) =>
  db
    .select({ count: sql`COUNT(*)::int` })
    .from(teachers)
    .where(and(eq(teachers.email, email), isNull(teachers.deletedAt)))
    .then((rows: any[]) => Number(rows[0]?.count || 0));

const update = (id: number, fields: any[], centerId?: number) => {
  const setData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  if (fields[0] != null) setData.firstName = fields[0];
  if (fields[1] != null) setData.lastName = fields[1];
  if (fields[2] != null) setData.username = fields[2];
  if (fields[3] != null) setData.email = fields[3];
  if (fields[4] != null) setData.phone = fields[4];
  if (fields[5] != null) setData.salaryPercentage = fields[5];
  if (fields[6] != null) setData.status = fields[6];
  if (fields[7] != null) setData.roles = parseJson(fields[7]);
  return db
    .update(teachers)
    .set(setData)
    .where(and(...scopedTeacherConditions(id, centerId)))
    .returning(teacherSelection)
    .then((rows: any[]) => rows[0] || null);
};

const getDeleteDependencies = async (id: number, centerId?: number) => {
  const scoped = (table: any) => {
    const conditions = [eq(table.teacherId, id)];
    if (centerId) conditions.push(eq(table.centerId, centerId));
    return conditions;
  };

  const [
    classRows,
    studentRows,
    subjectRows,
    assignmentRows,
    sessionRows,
    attendanceRows,
    gradeRows,
  ] = await Promise.all([
    db
      .select({ class_id: classes.classId, class_name: classes.className, class_code: classes.classCode })
      .from(classes)
      .where(and(...scoped(classes), isNull(classes.deletedAt)))
      .orderBy(asc(classes.classId)),
    db
      .select({ student_id: students.studentId, first_name: students.firstName, last_name: students.lastName })
      .from(students)
      .where(and(...scoped(students), isNull(students.deletedAt)))
      .orderBy(asc(students.studentId)),
    db
      .select({ subject_id: subjects.subjectId, subject_name: subjects.subjectName, subject_code: subjects.subjectCode })
      .from(subjects)
      .where(and(...scoped(subjects)))
      .orderBy(asc(subjects.subjectId)),
    db
      .select({ assignment_id: assignments.assignmentId, assignment_title: assignments.assignmentTitle })
      .from(assignments)
      .where(eq(assignments.teacherId, id))
      .orderBy(asc(assignments.assignmentId)),
    db
      .select({ session_id: sessions.sessionId, class_id: sessions.classId, session_date: sessions.sessionDate })
      .from(sessions)
      .where(and(...scoped(sessions), isNull(sessions.deletedAt)))
      .orderBy(asc(sessions.sessionId)),
    db
      .select({ count: sql`COUNT(*)::int` })
      .from(attendance)
      .where(and(...scoped(attendance))),
    db.select({ count: sql`COUNT(*)::int` }).from(grades).where(and(...scoped(grades))),
  ]);

  return {
    classes: classRows,
    students: studentRows,
    subjects: subjectRows,
    assignments: assignmentRows,
    sessions: sessionRows,
    attendance_count: Number((attendanceRows[0] as any)?.count || 0),
    grades_count: Number((gradeRows[0] as any)?.count || 0),
  };
};

const hasDeleteDependencies = (dependencies: any) =>
  dependencies.classes.length > 0 ||
  dependencies.students.length > 0 ||
  dependencies.subjects.length > 0 ||
  dependencies.assignments.length > 0 ||
  dependencies.sessions.length > 0 ||
  dependencies.attendance_count > 0 ||
  dependencies.grades_count > 0;

const unassignDeleteDependencies = async (id: number, centerId?: number) => {
  const scoped = (table: any, deleted = false) => {
    const conditions = [eq(table.teacherId, id)];
    if (centerId) conditions.push(eq(table.centerId, centerId));
    if (deleted && table.deletedAt) conditions.push(isNull(table.deletedAt));
    return and(...conditions);
  };

  await db.transaction(async (tx: any) => {
    await tx.update(students).set({ teacherId: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(scoped(students, true));
    await tx.update(classes).set({ teacherId: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(scoped(classes, true));
    await tx.update(subjects).set({ teacherId: null }).where(scoped(subjects));
    await tx.update(assignments).set({ teacherId: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(assignments.teacherId, id));
    await tx.update(sessions).set({ teacherId: null, updatedAt: sql`CURRENT_TIMESTAMP` }).where(scoped(sessions, true));
  });
};

const remove = (id: number, centerId?: number) =>
  db
    .update(teachers)
    .set({ deletedAt: sql`CURRENT_TIMESTAMP`, status: 'Retired', updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...scopedTeacherConditions(id, centerId)))
    .returning(teacherSelection)
    .then((rows: any[]) => rows[0] || null);

const purge = (id: number, centerId?: number) => {
  const conditions = [eq(teachers.teacherId, id), isNotNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  return db
    .delete(teachers)
    .where(and(...conditions))
    .returning(teacherSelection)
    .then((rows: any[]) => rows[0] || null);
};

const findPasswordHash = (id: number) =>
  db
    .select({ password_hash: teachers.passwordHash })
    .from(teachers)
    .where(and(eq(teachers.teacherId, id), isNull(teachers.deletedAt)))
    .then((rows: any[]) => rows[0]?.password_hash);

const setCredentials = (id: number, username: string, password_hash: string, centerId?: number) =>
  db
    .update(teachers)
    .set({ username, passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(...scopedTeacherConditions(id, centerId)))
    .returning({ teacher_id: teachers.teacherId, username: teachers.username, email: teachers.email })
    .then((rows: any[]) => rows[0] || null);

const updatePasswordHash = (id: number, password_hash: string) =>
  db
    .update(teachers)
    .set({ passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(teachers.teacherId, id), isNull(teachers.deletedAt)));

module.exports = {
  findAll,
  findPaginated,
  findById,
  findByUsername,
  insert,
  countByUsername,
  countByEmployeeId,
  countByEmail,
  update,
  getDeleteDependencies,
  hasDeleteDependencies,
  unassignDeleteDependencies,
  remove,
  purge,
  findPasswordHash,
  setCredentials,
  updatePasswordHash,
};

export {};
