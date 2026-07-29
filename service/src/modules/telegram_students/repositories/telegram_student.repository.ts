const { and, desc, eq, isNotNull, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const {
  classes,
  grades,
  payments: paymentsTable,
  sessions,
  studentCoinTransactions,
  students,
  teachers,
  telegramStudentRegistrations,
} = require('../../../db/schema');

const db = pool.db;

const rankRows = (rows: any[], score: (row: any) => any[]) => {
  let previousKey = '';
  let previousRank = 0;
  return rows.map((row, index) => {
    const key = JSON.stringify(score(row));
    const rank = key === previousKey ? previousRank : index + 1;
    previousKey = key;
    previousRank = rank;
    return { ...row, rank, total_students: rows.length };
  });
};

const resolveStudent = async (telegramUserId: string) => {
  const rows = await db
    .select({
      registration_id: telegramStudentRegistrations.registrationId,
      telegram_user_id: telegramStudentRegistrations.telegramUserId,
      telegram_chat_id: telegramStudentRegistrations.telegramChatId,
      telegram_username: telegramStudentRegistrations.telegramUsername,
      student_id: students.studentId,
      center_id: students.centerId,
      class_id: students.classId,
      teacher_id: students.teacherId,
      first_name: students.firstName,
      last_name: students.lastName,
      status: students.status,
      coins: students.coins,
      class_name: classes.className,
      class_code: classes.classCode,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
    })
    .from(telegramStudentRegistrations)
    .innerJoin(students, and(eq(students.studentId, telegramStudentRegistrations.convertedStudentId), isNull(students.deletedAt)))
    .leftJoin(classes, and(eq(classes.classId, students.classId), isNull(classes.deletedAt)))
    .leftJoin(teachers, and(eq(teachers.teacherId, students.teacherId), isNull(teachers.deletedAt)))
    .where(
      and(
        eq(telegramStudentRegistrations.telegramUserId, Number(telegramUserId)),
        isNotNull(telegramStudentRegistrations.convertedStudentId),
        eq(sql`LOWER(${telegramStudentRegistrations.status})`, 'imported')
      )
    )
    .orderBy(desc(telegramStudentRegistrations.convertedAt), desc(telegramStudentRegistrations.registrationId))
    .limit(1);
  return rows[0] || null;
};

const findLastLesson = async (studentId: number) => {
  const latestRows = await db
    .select({
      grade_id: grades.gradeId,
      session_id: grades.sessionId,
      student_id: grades.studentId,
      class_id: grades.classId,
      teacher_id: grades.teacherId,
      marks_obtained: grades.marksObtained,
      total_marks: grades.totalMarks,
      percentage: grades.percentage,
      grade_letter: grades.gradeLetter,
      attendance_score: grades.attendanceScore,
      homework_score: grades.homeworkScore,
      activity_score: grades.activityScore,
      total_daily_coin: grades.totalDailyCoin,
      session_date: sessions.sessionDate,
      start_time: sessions.startTime,
      end_time: sessions.endTime,
      class_name: classes.className,
      teacher_first_name: teachers.firstName,
      teacher_last_name: teachers.lastName,
    })
    .from(grades)
    .innerJoin(sessions, and(eq(sessions.sessionId, grades.sessionId), isNull(sessions.deletedAt)))
    .leftJoin(classes, eq(classes.classId, grades.classId))
    .leftJoin(teachers, eq(teachers.teacherId, grades.teacherId))
    .where(eq(grades.studentId, studentId))
    .orderBy(desc(sessions.sessionDate), desc(sessions.startTime), desc(grades.gradeId))
    .limit(1);
  const latest = latestRows[0];
  if (!latest) return null;

  const [lessonGrades, lessonCoins] = await Promise.all([
    db
      .select({
        student_id: grades.studentId,
        percentage: grades.percentage,
        marks_obtained: grades.marksObtained,
        total_daily_coin: grades.totalDailyCoin,
        grade_id: grades.gradeId,
      })
      .from(grades)
      .where(eq(grades.sessionId, latest.session_id)),
    db
      .select({ coins_given: sql`COALESCE(SUM(${studentCoinTransactions.delta}), 0)::int` })
      .from(studentCoinTransactions)
      .where(
        and(
          eq(studentCoinTransactions.studentId, studentId),
          eq(studentCoinTransactions.sourceType, 'lesson_session'),
          eq(studentCoinTransactions.sourceId, latest.session_id)
        )
      ),
  ]);

  const ranked = rankRows(
    lessonGrades
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(b.percentage || 0) - Number(a.percentage || 0) ||
          Number(b.marks_obtained || 0) - Number(a.marks_obtained || 0) ||
          Number(b.total_daily_coin || 0) - Number(a.total_daily_coin || 0) ||
          Number(a.grade_id) - Number(b.grade_id)
      ),
    (row: any) => [Number(row.percentage || 0), Number(row.marks_obtained || 0), Number(row.total_daily_coin || 0)]
  ).find((row: any) => Number(row.student_id) === Number(studentId));

  return {
    ...latest,
    teacher_id: latest.teacher_id,
    class_id: latest.class_id,
    rank: ranked?.rank || null,
    total_students: ranked?.total_students || lessonGrades.length,
    coins_given: Number((lessonCoins[0] as any)?.coins_given ?? latest.total_daily_coin ?? 0),
  };
};

const classRankRows = async (centerId: number, classId?: number) => {
  const points = db
    .select({
      student_id: grades.studentId,
      points: sql`COALESCE(SUM(${grades.marksObtained}), 0)::numeric`.as('points'),
    })
    .from(grades)
    .where(classId ? and(eq(grades.centerId, centerId), eq(grades.classId, classId)) : eq(grades.centerId, centerId))
    .groupBy(grades.studentId)
    .as('points');

  const conditions = [eq(students.centerId, centerId), isNull(students.deletedAt)];
  if (classId) conditions.push(eq(students.classId, classId));

  const rows = await db
    .select({
      student_id: students.studentId,
      first_name: students.firstName,
      last_name: students.lastName,
      status: students.status,
      class_id: students.classId,
      class_name: classes.className,
      coins: students.coins,
      points: sql`COALESCE(${points.points}, 0)`,
    })
    .from(students)
    .leftJoin(classes, eq(classes.classId, students.classId))
    .leftJoin(points, eq(points.student_id, students.studentId))
    .where(and(...conditions));

  return rankRows(
    rows
      .slice()
      .sort(
        (a: any, b: any) =>
          Number(b.coins || 0) - Number(a.coins || 0) ||
          Number(b.points || 0) - Number(a.points || 0) ||
          Number(a.student_id) - Number(b.student_id)
      ),
    (row: any) => [Number(row.coins || 0), Number(row.points || 0)]
  );
};

const classRank = async (centerId: number, classId: number) =>
  (await classRankRows(centerId, classId)).sort(
    (a: any, b: any) => Number(a.rank) - Number(b.rank) || String(a.last_name || '').localeCompare(String(b.last_name || '')) || String(a.first_name || '').localeCompare(String(b.first_name || ''))
  );

const classRankSummary = async (centerId: number, classId: number, studentId: number) =>
  (await classRankRows(centerId, classId)).find((row: any) => Number(row.student_id) === Number(studentId)) || null;

const centerRank = async (centerId: number, limit = 100) =>
  (await classRankRows(centerId)).slice(0, limit).sort(
    (a: any, b: any) => Number(a.rank) - Number(b.rank) || String(a.last_name || '').localeCompare(String(b.last_name || '')) || String(a.first_name || '').localeCompare(String(b.first_name || ''))
  );

const centerRankSummary = async (centerId: number, studentId: number) =>
  (await classRankRows(centerId)).find((row: any) => Number(row.student_id) === Number(studentId)) || null;

const results = async (studentId: number, page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const [rows, count] = await Promise.all([
    db
      .select({
        grade_id: grades.gradeId,
        session_id: grades.sessionId,
        subject: grades.subject,
        marks_obtained: grades.marksObtained,
        total_marks: grades.totalMarks,
        percentage: grades.percentage,
        grade_letter: grades.gradeLetter,
        attendance_score: grades.attendanceScore,
        homework_score: grades.homeworkScore,
        activity_score: grades.activityScore,
        total_daily_coin: grades.totalDailyCoin,
        created_at: grades.createdAt,
        session_date: sessions.sessionDate,
        start_time: sessions.startTime,
        class_name: classes.className,
        teacher_first_name: teachers.firstName,
        teacher_last_name: teachers.lastName,
      })
      .from(grades)
      .leftJoin(sessions, eq(sessions.sessionId, grades.sessionId))
      .leftJoin(classes, eq(classes.classId, grades.classId))
      .leftJoin(teachers, eq(teachers.teacherId, grades.teacherId))
      .where(eq(grades.studentId, studentId))
      .orderBy(desc(sessions.sessionDate), desc(sessions.startTime), desc(grades.gradeId))
      .limit(limit)
      .offset(offset),
    db.select({ total: sql`COUNT(*)::int` }).from(grades).where(eq(grades.studentId, studentId)),
  ]);
  return { data: rows, total: Number((count[0] as any)?.total || 0), page, limit };
};

const payments = async (studentId: number, centerId: number, page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const [rows, count] = await Promise.all([
    db
      .select({
        payment_id: paymentsTable.paymentId,
        payment_date: paymentsTable.paymentDate,
        amount: paymentsTable.amount,
        currency: paymentsTable.currency,
        payment_method: paymentsTable.paymentMethod,
        payment_status: paymentsTable.paymentStatus,
        payment_type: paymentsTable.paymentType,
        receipt_number: paymentsTable.receiptNumber,
        final_amount: paymentsTable.finalAmount,
        discount_amount: paymentsTable.discountAmount,
        is_complete: paymentsTable.isComplete,
      })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.studentId, studentId), eq(paymentsTable.centerId, centerId), isNull(paymentsTable.deletedAt)))
      .orderBy(desc(paymentsTable.paymentDate), desc(paymentsTable.paymentId))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql`COUNT(*)::int` })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.studentId, studentId), eq(paymentsTable.centerId, centerId), isNull(paymentsTable.deletedAt))),
  ]);
  return { data: rows, total: Number((count[0] as any)?.total || 0), page, limit };
};

module.exports = {
  resolveStudent,
  findLastLesson,
  classRank,
  classRankSummary,
  centerRank,
  centerRankSummary,
  results,
  payments,
};

export {};
