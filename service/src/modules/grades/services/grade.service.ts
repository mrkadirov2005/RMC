const gradeRepository = require('../repositories/grade.repository');
const { and, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { attendance, grades, studentCoinTransactions, students } = require('../../../db/schema');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');
const studentService = require('../../students/services/student.service');
const { calculateCoins } = require('../../../utils/coinCalculator');
const settingsService = require('../../settings/services/settings.service');
const db = pool.db;

const listGrades = (centerId?: number, teacherId?: number, studentId?: number) =>
  gradeRepository.findAll(centerId, teacherId, studentId);

const getGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.findById(id, centerId, teacherId);

const createGrade = async (body: any, centerId?: number) => {
  const {
    student_id,
    teacher_id,
    subject,
    class_id,
    marks_obtained,
    total_marks,
    percentage,
    grade_letter,
    academic_year,
    term,
    session_id,
    attendance_score,
    homework_score,
    activity_score,
    points_score,
  } = body;
  if (centerId) {
    const [studentOk, classOk] = await Promise.all([
      studentInCenter(student_id, centerId),
      classInCenter(class_id, centerId),
    ]);
    if (!studentOk || !classOk) return { error: 'invalid_center' as const };
  }

  const totalMarks = total_marks || 100;
  const derivedTotal =
    (attendance_score ?? 0) +
    (homework_score ?? 0) +
    (activity_score ?? 0) +
    (points_score ?? 0);
  const finalMarks = Number.isFinite(marks_obtained) ? marks_obtained : derivedTotal;
  const finalPercentage = Number.isFinite(percentage)
    ? percentage
    : totalMarks > 0
    ? (finalMarks * 100) / totalMarks
    : null;

  console.log('🔄 [Grade] Inserting grade...', { student_id, subject, marks_obtained, total_marks });
  
  const row = await gradeRepository.insert([
    student_id,
    teacher_id,
    subject,
    class_id,
    session_id ?? null,
    finalMarks,
    totalMarks,
    finalPercentage,
    grade_letter,
    academic_year,
    term,
    centerId ?? body.center_id,
    attendance_score ?? 0,
    homework_score ?? 0,
    activity_score ?? 0,
    points_score ?? 0,
  ]);

  console.log('✅ [Grade] Grade inserted:', { gradeId: row?.grade_id, student_id: row?.student_id, marks_obtained: row?.marks_obtained, total_marks: row?.total_marks, percentage: row?.percentage });

  // Add coins to student if grade was created successfully
  if (row && !row.error) {
    console.log('💰 [Coins] Attempting to add coins...', { hasMarksObtained: row.marks_obtained !== null, hasTotalMarks: row.total_marks !== null });
    if (row.marks_obtained !== null && row.total_marks !== null) {
      try {
        const marksNum = Number(row.marks_obtained);
        const totalNum = Number(row.total_marks);
        const percentageNum = Number(row.percentage);
        const coinsToAdd = calculateCoins(marksNum, totalNum);
        console.log(`💰 [Coins] Calculated: ${coinsToAdd} coins for ${marksNum}/${totalNum} (${percentageNum?.toFixed(1)}%)`);
        
        if (coinsToAdd !== 0) {
          console.log(`💳 [Coins] Calling addCoins with:`, { studentId: row.student_id, delta: coinsToAdd, reason: `Grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}` });
          const coinResult = await studentService.addCoins(
            row.student_id,
            coinsToAdd,
            `Grade awarded: ${percentageNum?.toFixed(1)}% in ${row.subject}`,
            null,
            'system'
          );
          console.log(`✅ [Coins] Added successfully:`, coinResult);
        } else {
          console.log(`⭕ [Coins] No coins to add (0 coins) for ${percentageNum?.toFixed(1)}%`);
        }
      } catch (coinError) {
        console.error('❌ [Coins] Error adding coins for grade:', coinError);
      }
    } else {
      console.log('⚠️ [Coins] Skipping: marks_obtained or total_marks is null');
    }
  } else {
    console.log('❌ [Grade] Grade insertion failed or had error:', row);
  }

  return row;
};

const updateGrade = (id: number, body: any, centerId?: number, teacherId?: number) => {
  const { marks_obtained, percentage, grade_letter, attendance_score, homework_score, activity_score, points_score } = body;
  return gradeRepository.update(
    id,
    [marks_obtained, percentage, grade_letter, attendance_score, homework_score, activity_score, points_score],
    centerId,
    teacherId
  );
};

const listByStudent = (studentId: number, centerId?: number, teacherId?: number) =>
  gradeRepository.findByStudent(studentId, centerId, teacherId);

const listBySession = (sessionId: number, centerId?: number, teacherId?: number) =>
  gradeRepository.findBySession(sessionId, centerId, teacherId);

const deleteGrade = (id: number, centerId?: number, teacherId?: number) => gradeRepository.remove(id, centerId, teacherId);

const createBulk = async (grades: any[], centerId?: number) => {
  const results: any[] = [];
  for (const g of grades) {
    const row = await createGrade(g, centerId);
    // Note: Coins are added in createGrade function, no need to add here
    results.push(row);
  }
  return results;
};

const upsertSessionScores = async (body: any, centerId?: number) => {
  const {
    student_id,
    teacher_id,
    class_id,
    session_id,
    attendance_score,
    homework_score,
    activity_score,
    points_score,
    academic_year,
    term,
    total_marks,
    subject,
  } = body;
  if (!session_id) return null;
  
  console.log('🔄 [SessionScore] Upserting session scores...', { student_id, subject });
  
  const row = await gradeRepository.upsertSessionScores([
    student_id,
    teacher_id,
    subject || 'Session',
    class_id,
    session_id,
    total_marks || 100,
    academic_year,
    term,
    centerId ?? body.center_id,
    attendance_score ?? null,
    homework_score ?? null,
    activity_score ?? null,
    points_score ?? null,
  ]);

  console.log('✅ [SessionScore] Session scores upserted:', { gradeId: row?.grade_id, student_id: row?.student_id, marks_obtained: row?.marks_obtained, total_marks: row?.total_marks, percentage: row?.percentage });

  // Add/update academic coins from the combined session score.
  if (row && !row.error && body.award_coins !== false) {
    console.log('💰 [Coins-Session] Attempting to add coins...', { hasMarksObtained: row.marks_obtained !== null, hasTotalMarks: row.total_marks !== null });
    if (row.marks_obtained !== null && row.total_marks !== null) {
      try {
        const marksNum = Number(row.marks_obtained);
        const totalNum = Number(row.total_marks);
        const percentageNum = Number(row.percentage);
        const coinsToAdd = calculateCoins(marksNum, totalNum);
        console.log(`💰 [Coins-Session] Calculated: ${coinsToAdd} coins for ${marksNum}/${totalNum} (${percentageNum?.toFixed(1)}%)`);

        const reason = `Academic performance: ${marksNum}/${totalNum} in ${row.subject}`;
        const coinResult = await studentService.upsertSourceCoins(
          row.student_id,
          coinsToAdd,
          reason,
          'lesson_session',
          Number(row.session_id),
          row.teacher_id ?? null,
          'teacher'
        );
        await gradeRepository.updateLessonCoins(row.grade_id, coinsToAdd, coinsToAdd, reason);
        console.log(`✅ [Coins-Session] Upserted successfully:`, coinResult);
      } catch (coinError) {
        console.error('❌ [Coins-Session] Error adding coins for session score:', coinError);
      }
    } else {
      console.log('⚠️ [Coins-Session] Skipping: marks_obtained or total_marks is null');
    }
  } else {
    console.log('❌ [SessionScore] Session score upsert failed or had error:', row);
  }

  return row;
};

const attendanceSelection = {
  attendance_id: attendance.attendanceId,
  center_id: attendance.centerId,
  student_id: attendance.studentId,
  teacher_id: attendance.teacherId,
  class_id: attendance.classId,
  session_id: attendance.sessionId,
  attendance_date: attendance.attendanceDate,
  status: attendance.status,
  remarks: attendance.remarks,
};

const gradeSelection = {
  grade_id: grades.gradeId,
  center_id: grades.centerId,
  student_id: grades.studentId,
  teacher_id: grades.teacherId,
  subject: grades.subject,
  class_id: grades.classId,
  session_id: grades.sessionId,
  total_marks: grades.totalMarks,
  attendance_score: grades.attendanceScore,
  homework_score: grades.homeworkScore,
  activity_score: grades.activityScore,
  points_score: grades.pointsScore,
  marks_obtained: grades.marksObtained,
  percentage: grades.percentage,
  academic_year: grades.academicYear,
  term: grades.term,
};

const calculateSessionScore = (payload: any) => {
  const totalMarks = Number(payload.total_marks || 100);
  const marks =
    Number(payload.attendance_score || 0) +
    Number(payload.homework_score || 0) +
    Number(payload.activity_score || 0) +
    Number(payload.points_score || 0);
  return {
    marksObtained: marks,
    percentage: totalMarks > 0 ? Number(((marks * 100) / totalMarks).toFixed(2)) : null,
  };
};

const upsertAttendanceInTransaction = async (tx: any, payload: any) => {
  const existing = await tx
    .select({ attendance_id: attendance.attendanceId })
    .from(attendance)
    .where(and(eq(attendance.studentId, payload.student_id), eq(attendance.sessionId, payload.session_id)))
    .limit(1);
  const values = {
    centerId: payload.center_id,
    studentId: payload.student_id,
    teacherId: payload.teacher_id,
    classId: payload.class_id,
    sessionId: payload.session_id,
    attendanceDate: payload.attendance_date,
    status: payload.status || 'Present',
    remarks: payload.remarks,
  };
  if (existing[0]) {
    const rows = await tx.update(attendance).set(values).where(eq(attendance.attendanceId, existing[0].attendance_id)).returning(attendanceSelection);
    return rows[0];
  }
  const rows = await tx.insert(attendance).values(values).returning(attendanceSelection);
  return rows[0];
};

const upsertSessionScoreInTransaction = async (tx: any, payload: any) => {
  const normalized = {
    ...payload,
    subject: payload.subject || 'Session',
    total_marks: payload.total_marks || 100,
    attendance_score: payload.attendance_score ?? null,
    homework_score: payload.homework_score ?? null,
    activity_score: payload.activity_score ?? null,
    points_score: payload.points_score ?? null,
  };
  const totals = calculateSessionScore(normalized);
  const existing = await tx
    .select(gradeSelection)
    .from(grades)
    .where(and(eq(grades.studentId, normalized.student_id), eq(grades.sessionId, normalized.session_id)))
    .limit(1);
  if (existing[0]) {
    const merged = {
      attendance_score: normalized.attendance_score ?? existing[0].attendance_score,
      homework_score: normalized.homework_score ?? existing[0].homework_score,
      activity_score: normalized.activity_score ?? existing[0].activity_score,
      points_score: normalized.points_score ?? existing[0].points_score,
      total_marks: normalized.total_marks ?? existing[0].total_marks ?? 100,
    };
    const mergedTotals = calculateSessionScore(merged);
    const rows = await tx
      .update(grades)
      .set({
        attendanceScore: merged.attendance_score,
        homeworkScore: merged.homework_score,
        activityScore: merged.activity_score,
        pointsScore: merged.points_score,
        totalMarks: merged.total_marks,
        subject: normalized.subject ?? existing[0].subject,
        teacherId: normalized.teacher_id ?? existing[0].teacher_id,
        classId: normalized.class_id ?? existing[0].class_id,
        academicYear: normalized.academic_year ?? existing[0].academic_year,
        term: normalized.term ?? existing[0].term,
        centerId: normalized.center_id ?? existing[0].center_id,
        marksObtained: mergedTotals.marksObtained,
        percentage: mergedTotals.percentage,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(grades.gradeId, existing[0].grade_id))
      .returning(gradeSelection);
    return rows[0];
  }
  const rows = await tx
    .insert(grades)
    .values({
      studentId: normalized.student_id,
      teacherId: normalized.teacher_id,
      subject: normalized.subject,
      classId: normalized.class_id,
      sessionId: normalized.session_id,
      totalMarks: normalized.total_marks,
      academicYear: normalized.academic_year,
      term: normalized.term,
      centerId: normalized.center_id,
      attendanceScore: normalized.attendance_score,
      homeworkScore: normalized.homework_score,
      activityScore: normalized.activity_score,
      pointsScore: normalized.points_score,
      marksObtained: totals.marksObtained,
      percentage: totals.percentage,
    })
    .returning(gradeSelection);
  return rows[0];
};

const calculateCoinsFromMapping = (marksObtained: number, totalMarks: number, mapping: any[]) => {
  if (!totalMarks || totalMarks <= 0) return 0;
  const score = Math.min(100, Math.max(0, (marksObtained / totalMarks) * 100));
  const rows = [...mapping].sort((a, b) => Number(b.score) - Number(a.score));
  for (const row of rows) {
    if (score >= Number(row.score)) return Number(row.coins || 0);
  }
  return Number(rows[rows.length - 1]?.coins || 0);
};

const upsertLessonCoinsInTransaction = async (client: any, grade: any, teacherId: number | null, scoringSettings: any, stellarBonusCoins = 0) => {
  const marksNum = Number(grade.marks_obtained);
  const totalNum = Number(grade.total_marks);
  const baseCoins = calculateCoinsFromMapping(marksNum, totalNum, scoringSettings.coinScoreMapping);
  const coinsToAdd = baseCoins + stellarBonusCoins;
  const reason = `Academic performance: ${marksNum}/${totalNum} in ${grade.subject}${stellarBonusCoins > 0 ? ` | Stellar student bonus: +${stellarBonusCoins}` : ''}`;

  const studentRows = await client
    .select({ student_id: students.studentId, center_id: students.centerId, coins: students.coins })
    .from(students)
    .where(and(eq(students.studentId, grade.student_id), isNull(students.deletedAt)))
    .limit(1);
  const student = studentRows[0];
  if (!student) return { error: 'student_not_found' as const };

  const existingRows = await client
    .select({ transaction_id: studentCoinTransactions.transactionId, delta: studentCoinTransactions.delta })
    .from(studentCoinTransactions)
    .where(and(eq(studentCoinTransactions.studentId, grade.student_id), eq(studentCoinTransactions.sourceType, 'lesson_session'), eq(studentCoinTransactions.sourceId, Number(grade.session_id))))
    .limit(1);
  const existing = existingRows[0];
  const previousDelta = Number(existing?.delta || 0);
  const nextCoins = Number(student.coins || 0) + (coinsToAdd - previousDelta);
  if (nextCoins < -9999) return { error: 'insufficient' as const, balance: Number(student.coins || 0) };

  await client
    .update(students)
    .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(students.studentId, grade.student_id), isNull(students.deletedAt)));

  const tx = existing
    ? await client
        .update(studentCoinTransactions)
        .set({ delta: coinsToAdd, reason, createdBy: teacherId, createdByType: 'teacher', updatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(studentCoinTransactions.transactionId, existing.transaction_id))
        .returning()
    : await client
        .insert(studentCoinTransactions)
        .values({
          studentId: grade.student_id,
          centerId: student.center_id,
          delta: coinsToAdd,
          reason,
          createdBy: teacherId,
          createdByType: 'teacher',
          sourceType: 'lesson_session',
          sourceId: Number(grade.session_id),
        })
        .returning();

  await client
    .update(grades)
    .set({ baseCoin: baseCoins, totalDailyCoin: coinsToAdd, coinComment: reason, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(grades.gradeId, grade.grade_id));

  return { balance: nextCoins, transaction: tx[0] };
};

const clearLessonCoinsInTransaction = async (client: any, grade: any) => {
  const studentRows = await client
    .select({ student_id: students.studentId, coins: students.coins })
    .from(students)
    .where(and(eq(students.studentId, grade.student_id), isNull(students.deletedAt)))
    .limit(1);
  const student = studentRows[0];
  if (!student) return null;

  const existingRows = await client
    .select({ transaction_id: studentCoinTransactions.transactionId, delta: studentCoinTransactions.delta })
    .from(studentCoinTransactions)
    .where(and(eq(studentCoinTransactions.studentId, grade.student_id), eq(studentCoinTransactions.sourceType, 'lesson_session'), eq(studentCoinTransactions.sourceId, Number(grade.session_id))))
    .limit(1);
  const existing = existingRows[0];
  if (existing) {
    const nextCoins = Number(student.coins || 0) - Number(existing.delta || 0);
    await client
      .update(students)
      .set({ coins: nextCoins, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(students.studentId, grade.student_id), isNull(students.deletedAt)));
    await client.delete(studentCoinTransactions).where(eq(studentCoinTransactions.transactionId, existing.transaction_id));
  }

  await client
    .update(grades)
    .set({ baseCoin: 0, totalDailyCoin: 0, coinComment: null, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(grades.gradeId, grade.grade_id));

  return existing || null;
};

const saveSessionWorkflow = async (body: any, centerId?: number) => {
  const {
    class_id,
    session_id,
    teacher_id,
    attendance_date,
    subject,
    total_marks,
    award_coins,
    records,
  } = body;

  if (!class_id || !session_id || !Array.isArray(records) || records.length === 0) {
    return { error: 'invalid_payload' as const };
  }
  if (award_coins !== false && records.filter((record: any) => record.is_stellar_student).length > 1) {
    return { error: 'multiple_stellar_students' as const };
  }

  const resolvedCenterId = centerId ?? body.center_id;
  if (resolvedCenterId) {
    const classOk = await classInCenter(class_id, resolvedCenterId);
    if (!classOk) return { error: 'invalid_center' as const };
  }
  const scoringSettings = await settingsService.getLessonScoring(resolvedCenterId);

  return db.transaction(async (client: any) => {
    const attendanceRows: any[] = [];
    const gradeRows: any[] = [];
    const coinRows: any[] = [];

    for (const record of records) {
      const studentId = Number(record.student_id);
      if (!studentId) throw new Error('student_id is required for every record');

      if (resolvedCenterId) {
        const studentRows = await client
          .select({ student_id: students.studentId })
          .from(students)
          .where(and(eq(students.studentId, studentId), eq(students.centerId, resolvedCenterId), isNull(students.deletedAt)))
          .limit(1);
        if (studentRows.length === 0) throw new Error(`Student ${studentId} does not belong to this center.`);
      }

      if (record.attendance_status) {
        const attendanceRow = await upsertAttendanceInTransaction(client, {
          center_id: resolvedCenterId,
          student_id: studentId,
          teacher_id,
          class_id,
          session_id,
          attendance_date,
          status: record.attendance_status,
          remarks: record.attendance_remarks || 'Daily Session Grading',
        });
        attendanceRows.push(attendanceRow);
      }

      const gradeRow = await upsertSessionScoreInTransaction(client, {
        center_id: resolvedCenterId,
        student_id: studentId,
        teacher_id,
        class_id,
        session_id,
        subject,
        total_marks,
        attendance_score: record.attendance_score ?? null,
        homework_score: record.homework_score ?? null,
        activity_score: record.activity_score ?? null,
        points_score: record.points_score ?? null,
      });
      gradeRows.push(gradeRow);

      if (award_coins !== false) {
        const stellarBonusCoins = record.is_stellar_student ? Number(scoringSettings.stellarBonusCoins || 0) : 0;
        const coinRow = await upsertLessonCoinsInTransaction(client, gradeRow, teacher_id ?? null, scoringSettings, stellarBonusCoins);
        if (coinRow?.error) throw new Error(`Failed to save coins for student ${studentId}: ${coinRow.error}`);
        coinRows.push(coinRow);
      } else {
        await clearLessonCoinsInTransaction(client, gradeRow);
      }
    }

    return { attendance: attendanceRows, grades: gradeRows, coins: coinRows };
  });
};

module.exports = {
  listGrades,
  getGrade,
  createGrade,
  updateGrade,
  listByStudent,
  listBySession,
  deleteGrade,
  createBulk,
  upsertSessionScores,
  saveSessionWorkflow,
};

export {};
