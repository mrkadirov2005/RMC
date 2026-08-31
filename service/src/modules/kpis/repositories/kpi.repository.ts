const { and, asc, desc, eq, gte, isNull, lt, or, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, grades, sessions, students, teacherKpis, teachers } = require('../../../db/schema');

const db = pool.db;

const kpiSelection = {
  kpi_id: teacherKpis.kpiId,
  center_id: teacherKpis.centerId,
  teacher_id: teacherKpis.teacherId,
  kpi_year: teacherKpis.kpiYear,
  kpi_month: teacherKpis.kpiMonth,
  student_score: teacherKpis.studentScore,
  retention_score: teacherKpis.retentionScore,
  contribution_score: teacherKpis.contributionScore,
  teaching_quality_score: teacherKpis.teachingQualityScore,
  final_score: teacherKpis.finalScore,
  notes: teacherKpis.notes,
  marked_by_id: teacherKpis.markedById,
  marked_by_user_type: teacherKpis.markedByUserType,
  marked_by_role: teacherKpis.markedByRole,
  marked_by_name: teacherKpis.markedByName,
  created_at: teacherKpis.createdAt,
  updated_at: teacherKpis.updatedAt,
};

const pad2 = (value: number) => String(value).padStart(2, '0');

const monthRange = (year: number, month: number) => {
  const start = `${year}-${pad2(month)}-01`;
  const endDate = new Date(year, month, 1);
  const end = `${endDate.getFullYear()}-${pad2(endDate.getMonth() + 1)}-01`;
  return { start, end };
};

const findRecord = async (teacherId: number, year: number, month: number, centerId?: number) => {
  const conditions = [
    eq(teacherKpis.teacherId, teacherId),
    eq(teacherKpis.kpiYear, year),
    eq(teacherKpis.kpiMonth, month),
  ];
  if (centerId) conditions.push(eq(teacherKpis.centerId, centerId));
  const rows = await db.select(kpiSelection).from(teacherKpis).where(and(...conditions)).limit(1);
  return rows[0] || null;
};

const upsertRecord = async (data: {
  teacherId: number;
  centerId?: number | null;
  kpiYear: number;
  kpiMonth: number;
  studentScore: number;
  retentionScore: number;
  contributionScore: number;
  teachingQualityScore: number;
  finalScore: number;
  markedById?: number | null;
  markedByUserType?: string | null;
  markedByRole?: string | null;
  markedByName?: string | null;
  notes?: string | null;
}) => {
  const rows = await db
    .insert(teacherKpis)
    .values({
      centerId: data.centerId ?? null,
      teacherId: data.teacherId,
      kpiYear: data.kpiYear,
      kpiMonth: data.kpiMonth,
      studentScore: String(data.studentScore),
      retentionScore: String(data.retentionScore),
      contributionScore: String(data.contributionScore),
      teachingQualityScore: String(data.teachingQualityScore),
      finalScore: String(data.finalScore),
      markedById: data.markedById ?? null,
      markedByUserType: data.markedByUserType ?? null,
      markedByRole: data.markedByRole ?? null,
      markedByName: data.markedByName ?? null,
      notes: data.notes ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .onConflictDoUpdate({
      target: [teacherKpis.teacherId, teacherKpis.kpiYear, teacherKpis.kpiMonth],
      set: {
        centerId: data.centerId ?? null,
        studentScore: String(data.studentScore),
        retentionScore: String(data.retentionScore),
        contributionScore: String(data.contributionScore),
        teachingQualityScore: String(data.teachingQualityScore),
        finalScore: String(data.finalScore),
        markedById: data.markedById ?? null,
        markedByUserType: data.markedByUserType ?? null,
        markedByRole: data.markedByRole ?? null,
        markedByName: data.markedByName ?? null,
        notes: data.notes ?? null,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    })
    .returning(kpiSelection);
  return rows[0];
};

const listTeachers = (centerId?: number) => {
  const conditions = [isNull(teachers.deletedAt)];
  if (centerId) conditions.push(eq(teachers.centerId, centerId));
  return db
    .select({
      teacher_id: teachers.teacherId,
      center_id: teachers.centerId,
      first_name: teachers.firstName,
      last_name: teachers.lastName,
    })
    .from(teachers)
    .where(and(...conditions))
    .orderBy(asc(teachers.firstName), asc(teachers.lastName));
};

const listRecordsForTeacher = (teacherId: number, centerId?: number) => {
  const conditions = [eq(teacherKpis.teacherId, teacherId)];
  if (centerId) conditions.push(eq(teacherKpis.centerId, centerId));
  return db
    .select(kpiSelection)
    .from(teacherKpis)
    .where(and(...conditions))
    .orderBy(desc(teacherKpis.kpiYear), desc(teacherKpis.kpiMonth));
};

// Effective teacher scoping mirrors report.repository.ts: a student belongs to the class's
// teacher when assigned to a class, otherwise falls back to the student's own teacher_id.
const monthlyStudentScore = async ({
  centerId,
  teacherId,
  year,
  month,
}: {
  centerId?: number;
  teacherId: number;
  year: number;
  month: number;
}) => {
  const { start, end } = monthRange(year, month);
  const conditions: any[] = [
    eq(sessions.teacherId, teacherId),
    gte(sessions.sessionDate, start),
    lt(sessions.sessionDate, end),
  ];
  if (centerId) conditions.push(eq(sessions.centerId, centerId));

  const rows = await db
    .select({
      average: sql`AVG(
        COALESCE(${grades.attendanceScore}, 0) +
        COALESCE(${grades.homeworkScore}, 0) +
        COALESCE(${grades.activityScore}, 0) +
        COALESCE(${grades.pointsScore}, 0)
      )`,
    })
    .from(grades)
    .innerJoin(sessions, eq(sessions.sessionId, grades.sessionId))
    .where(and(...conditions));

  return Number(rows[0]?.average) || 0;
};

const monthlyRetentionCounts = async ({
  centerId,
  teacherId,
  year,
  month,
}: {
  centerId?: number;
  teacherId: number;
  year: number;
  month: number;
}) => {
  const { start, end } = monthRange(year, month);
  const teacherScope = eq(sql`COALESCE(${classes.teacherId}, ${students.teacherId})`, teacherId);
  const countQuery = () =>
    db
      .select({ count: sql`COUNT(DISTINCT ${students.studentId})::int` })
      .from(students)
      .leftJoin(classes, and(eq(classes.classId, students.classId), isNull(classes.deletedAt)));

  const startConditions: any[] = [
    teacherScope,
    lt(sql`${students.createdAt}::date`, start),
    or(isNull(students.deletedAt), gte(sql`${students.deletedAt}::date`, start)),
  ];
  if (centerId) startConditions.push(eq(students.centerId, centerId));

  const leftConditions: any[] = [
    teacherScope,
    gte(sql`${students.deletedAt}::date`, start),
    lt(sql`${students.deletedAt}::date`, end),
  ];
  if (centerId) leftConditions.push(eq(students.centerId, centerId));

  const [startRows, leftRows] = await Promise.all([
    countQuery().where(and(...startConditions)),
    countQuery().where(and(...leftConditions)),
  ]);

  return {
    startCount: Number(startRows[0]?.count) || 0,
    leftCount: Number(leftRows[0]?.count) || 0,
  };
};

module.exports = {
  findRecord,
  upsertRecord,
  listTeachers,
  listRecordsForTeacher,
  monthlyStudentScore,
  monthlyRetentionCounts,
};

export {};
