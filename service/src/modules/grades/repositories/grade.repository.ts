const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, grades } = require('../../../db/schema');

const db = pool.db;

const selection = {
  grade_id: grades.gradeId,
  center_id: grades.centerId,
  student_id: grades.studentId,
  teacher_id: grades.teacherId,
  subject: grades.subject,
  subject_id: grades.subjectId,
  class_id: grades.classId,
  session_id: grades.sessionId,
  marks_obtained: grades.marksObtained,
  total_marks: grades.totalMarks,
  percentage: grades.percentage,
  grade_letter: grades.gradeLetter,
  academic_year: grades.academicYear,
  term: grades.term,
  attendance_score: grades.attendanceScore,
  homework_score: grades.homeworkScore,
  activity_score: grades.activityScore,
  points_score: grades.pointsScore,
  base_coin: grades.baseCoin,
  total_daily_coin: grades.totalDailyCoin,
  coin_comment: grades.coinComment,
  score: grades.score,
  grade_type: grades.gradeType,
  notes: grades.notes,
  created_at: grades.createdAt,
  updated_at: grades.updatedAt,
};

const scope = (centerId?: number, teacherId?: number) => {
  const conditions: any[] = [];
  if (centerId) conditions.push(eq(classes.centerId, centerId), isNull(classes.deletedAt));
  if (teacherId) conditions.push(eq(grades.teacherId, teacherId));
  return conditions;
};

const queryGrades = (conditions: any[], centerId?: number, orderBy: any = desc(grades.gradeId)) => {
  let query = db.select(selection).from(grades);
  if (centerId) query = query.innerJoin(classes, eq(classes.classId, grades.classId));
  return query.where(and(...conditions)).orderBy(orderBy);
};

const findAll = (centerId?: number, teacherId?: number, studentId?: number) => {
  const conditions = [...scope(centerId, teacherId)];
  if (studentId) conditions.push(eq(grades.studentId, studentId));
  return queryGrades(conditions.length ? conditions : [sql`TRUE`], centerId);
};

const findById = async (id: number, centerId?: number, teacherId?: number) => {
  const rows = await queryGrades([eq(grades.gradeId, id), ...scope(centerId, teacherId)], centerId).limit(1);
  return rows[0] || null;
};

const insert = async (params: any[], client: any = db) => {
  const rows = await client
    .insert(grades)
    .values({
      studentId: params[0],
      teacherId: params[1],
      subject: params[2],
      classId: params[3],
      sessionId: params[4],
      marksObtained: params[5],
      totalMarks: params[6],
      percentage: params[7],
      gradeLetter: params[8],
      academicYear: params[9],
      term: params[10],
      centerId: params[11],
      attendanceScore: params[12],
      homeworkScore: params[13],
      activityScore: params[14],
      pointsScore: params[15],
    })
    .returning(selection);
  return rows[0];
};

const update = async (id: number, params: any[], centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db
    .update(grades)
    .set({
      marksObtained: sql`COALESCE(${params[0] ?? null}, ${grades.marksObtained})`,
      percentage: sql`COALESCE(${params[1] ?? null}, ${grades.percentage})`,
      gradeLetter: sql`COALESCE(${params[2] ?? null}, ${grades.gradeLetter})`,
      attendanceScore: sql`COALESCE(${params[3] ?? null}, ${grades.attendanceScore})`,
      homeworkScore: sql`COALESCE(${params[4] ?? null}, ${grades.homeworkScore})`,
      activityScore: sql`COALESCE(${params[5] ?? null}, ${grades.activityScore})`,
      pointsScore: sql`COALESCE(${params[6] ?? null}, ${grades.pointsScore})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(grades.gradeId, id))
    .returning(selection);
  return rows[0] || null;
};

const calculateSessionTotals = (values: any) => {
  const totalMarks = Number(values.totalMarks || 100);
  const total =
    Number(values.attendanceScore || 0) +
    Number(values.homeworkScore || 0) +
    Number(values.activityScore || 0) +
    Number(values.pointsScore || 0);
  return {
    marksObtained: total,
    percentage: totalMarks > 0 ? Number(((total * 100) / totalMarks).toFixed(2)) : null,
  };
};

const upsertSessionScores = async (params: any[]) => {
  const values = {
    studentId: params[0],
    teacherId: params[1],
    subject: params[2],
    classId: params[3],
    sessionId: params[4],
    totalMarks: params[5],
    academicYear: params[6],
    term: params[7],
    centerId: params[8],
    attendanceScore: params[9],
    homeworkScore: params[10],
    activityScore: params[11],
    pointsScore: params[12],
  };
  const totals = calculateSessionTotals(values);
  const existing = await db
    .select(selection)
    .from(grades)
    .where(and(eq(grades.studentId, values.studentId), eq(grades.sessionId, values.sessionId)))
    .limit(1);

  if (existing[0]) {
    const merged = {
      attendanceScore: values.attendanceScore ?? existing[0].attendance_score,
      homeworkScore: values.homeworkScore ?? existing[0].homework_score,
      activityScore: values.activityScore ?? existing[0].activity_score,
      pointsScore: values.pointsScore ?? existing[0].points_score,
      totalMarks: values.totalMarks ?? existing[0].total_marks ?? 100,
    };
    const recalculated = calculateSessionTotals(merged);
    const rows = await db
      .update(grades)
      .set({
        attendanceScore: merged.attendanceScore,
        homeworkScore: merged.homeworkScore,
        activityScore: merged.activityScore,
        pointsScore: merged.pointsScore,
        totalMarks: merged.totalMarks,
        subject: values.subject ?? existing[0].subject,
        teacherId: values.teacherId ?? existing[0].teacher_id,
        classId: values.classId ?? existing[0].class_id,
        academicYear: values.academicYear ?? existing[0].academic_year,
        term: values.term ?? existing[0].term,
        centerId: values.centerId ?? existing[0].center_id,
        marksObtained: recalculated.marksObtained,
        percentage: recalculated.percentage,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(grades.gradeId, existing[0].grade_id))
      .returning(selection);
    return rows[0];
  }

  const rows = await db
    .insert(grades)
    .values({ ...values, marksObtained: totals.marksObtained, percentage: totals.percentage })
    .returning(selection);
  return rows[0];
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  queryGrades([eq(grades.studentId, studentId), ...scope(centerId, teacherId)], centerId, desc(grades.academicYear));

const findBySession = (sessionId: number, centerId?: number, teacherId?: number) =>
  queryGrades([eq(grades.sessionId, sessionId), ...scope(centerId, teacherId)], centerId);

const updateLessonCoins = async (gradeId: number, baseCoin: number, totalDailyCoin: number, coinComment: string) => {
  const rows = await db
    .update(grades)
    .set({ baseCoin, totalDailyCoin, coinComment, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(grades.gradeId, gradeId))
    .returning(selection);
  return rows[0];
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  const existing = await findById(id, centerId, teacherId);
  if (!existing) return null;
  const rows = await db.delete(grades).where(eq(grades.gradeId, id)).returning(selection);
  return rows[0] || null;
};

module.exports = { findAll, findById, insert, update, findByStudent, findBySession, updateLessonCoins, remove, upsertSessionScores };

export {};
