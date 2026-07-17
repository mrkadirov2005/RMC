const gradeRepository = require('../repositories/grade.repository');
const pool = require('../../../db/pool');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');
const studentService = require('../../students/services/student.service');
const { calculateCoins } = require('../../../utils/coinCalculator');

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

const upsertAttendanceInTransaction = (client: any, payload: any) =>
  client
    .query(
      `INSERT INTO attendance (center_id, student_id, teacher_id, class_id, session_id, attendance_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, session_id) WHERE session_id IS NOT NULL
       DO UPDATE SET
         center_id = EXCLUDED.center_id,
         teacher_id = EXCLUDED.teacher_id,
         class_id = EXCLUDED.class_id,
         attendance_date = EXCLUDED.attendance_date,
         status = EXCLUDED.status,
         remarks = EXCLUDED.remarks
       RETURNING *`,
      [
        payload.center_id,
        payload.student_id,
        payload.teacher_id,
        payload.class_id,
        payload.session_id,
        payload.attendance_date,
        payload.status || 'Present',
        payload.remarks,
      ]
    )
    .then((r: any) => r.rows[0]);

const upsertSessionScoreInTransaction = (client: any, payload: any) =>
  client
    .query(
      `INSERT INTO grades (
         student_id,
         teacher_id,
         subject,
         class_id,
         session_id,
         total_marks,
         academic_year,
         term,
         center_id,
         attendance_score,
         homework_score,
         activity_score,
         points_score,
         marks_obtained,
         percentage
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         (COALESCE($10, 0) + COALESCE($11, 0) + COALESCE($12, 0) + COALESCE($13, 0)),
         CASE
           WHEN $6 > 0 THEN
             ROUND((COALESCE($10, 0) + COALESCE($11, 0) + COALESCE($12, 0) + COALESCE($13, 0)) * 100.0 / $6, 2)
           ELSE NULL
         END
       )
       ON CONFLICT (student_id, session_id) WHERE session_id IS NOT NULL
       DO UPDATE SET
         attendance_score = COALESCE(EXCLUDED.attendance_score, grades.attendance_score),
         homework_score = COALESCE(EXCLUDED.homework_score, grades.homework_score),
         activity_score = COALESCE(EXCLUDED.activity_score, grades.activity_score),
         points_score = COALESCE(EXCLUDED.points_score, grades.points_score),
         total_marks = COALESCE(EXCLUDED.total_marks, grades.total_marks, 100),
         subject = COALESCE(EXCLUDED.subject, grades.subject),
         teacher_id = COALESCE(EXCLUDED.teacher_id, grades.teacher_id),
         class_id = COALESCE(EXCLUDED.class_id, grades.class_id),
         academic_year = COALESCE(EXCLUDED.academic_year, grades.academic_year),
         term = COALESCE(EXCLUDED.term, grades.term),
         center_id = COALESCE(EXCLUDED.center_id, grades.center_id),
         marks_obtained = (
           COALESCE(EXCLUDED.attendance_score, grades.attendance_score, 0) +
           COALESCE(EXCLUDED.homework_score, grades.homework_score, 0) +
           COALESCE(EXCLUDED.activity_score, grades.activity_score, 0) +
           COALESCE(EXCLUDED.points_score, grades.points_score, 0)
         ),
         percentage = CASE
           WHEN COALESCE(EXCLUDED.total_marks, grades.total_marks, 100) > 0 THEN
             ROUND(
               (
                 COALESCE(EXCLUDED.attendance_score, grades.attendance_score, 0) +
                 COALESCE(EXCLUDED.homework_score, grades.homework_score, 0) +
                 COALESCE(EXCLUDED.activity_score, grades.activity_score, 0) +
                 COALESCE(EXCLUDED.points_score, grades.points_score, 0)
               ) * 100.0 / COALESCE(EXCLUDED.total_marks, grades.total_marks, 100),
               2
             )
           ELSE NULL
         END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        payload.student_id,
        payload.teacher_id,
        payload.subject || 'Session',
        payload.class_id,
        payload.session_id,
        payload.total_marks || 100,
        payload.academic_year,
        payload.term,
        payload.center_id,
        payload.attendance_score ?? null,
        payload.homework_score ?? null,
        payload.activity_score ?? null,
        payload.points_score ?? null,
      ]
    )
    .then((r: any) => r.rows[0]);

const upsertLessonCoinsInTransaction = async (client: any, grade: any, teacherId: number | null) => {
  const marksNum = Number(grade.marks_obtained);
  const totalNum = Number(grade.total_marks);
  const coinsToAdd = calculateCoins(marksNum, totalNum);
  const reason = `Academic performance: ${marksNum}/${totalNum} in ${grade.subject}`;

  const studentRes = await client.query(
    'SELECT student_id, center_id, coins FROM students WHERE student_id = $1 AND deleted_at IS NULL FOR UPDATE',
    [grade.student_id]
  );
  const student = studentRes.rows[0];
  if (!student) return { error: 'student_not_found' as const };

  const existingRes = await client.query(
    `SELECT transaction_id, delta
     FROM student_coin_transactions
     WHERE student_id = $1 AND source_type = $2 AND source_id = $3
     FOR UPDATE`,
    [grade.student_id, 'lesson_session', Number(grade.session_id)]
  );
  const existing = existingRes.rows[0];
  const previousDelta = Number(existing?.delta || 0);
  const nextCoins = Number(student.coins || 0) + (coinsToAdd - previousDelta);
  if (nextCoins < -9999) return { error: 'insufficient' as const, balance: Number(student.coins || 0) };

  await client.query('UPDATE students SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2 AND deleted_at IS NULL', [
    nextCoins,
    grade.student_id,
  ]);

  const tx = existing
    ? await client.query(
        `UPDATE student_coin_transactions
         SET delta = $1, reason = $2, created_by = $3, created_by_type = $4, updated_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $5
         RETURNING *`,
        [coinsToAdd, reason, teacherId, 'teacher', existing.transaction_id]
      )
    : await client.query(
        `INSERT INTO student_coin_transactions
           (student_id, center_id, delta, reason, created_by, created_by_type, source_type, source_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [grade.student_id, student.center_id, coinsToAdd, reason, teacherId, 'teacher', 'lesson_session', Number(grade.session_id)]
      );

  await client.query(
    `UPDATE grades
     SET base_coin = $1,
         total_daily_coin = $2,
         coin_comment = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE grade_id = $4`,
    [coinsToAdd, coinsToAdd, reason, grade.grade_id]
  );

  return { balance: nextCoins, transaction: tx.rows[0] };
};

const clearLessonCoinsInTransaction = async (client: any, grade: any) => {
  const studentRes = await client.query(
    'SELECT student_id, coins FROM students WHERE student_id = $1 AND deleted_at IS NULL FOR UPDATE',
    [grade.student_id]
  );
  const student = studentRes.rows[0];
  if (!student) return null;

  const existingRes = await client.query(
    `SELECT transaction_id, delta
     FROM student_coin_transactions
     WHERE student_id = $1 AND source_type = $2 AND source_id = $3
     FOR UPDATE`,
    [grade.student_id, 'lesson_session', Number(grade.session_id)]
  );
  const existing = existingRes.rows[0];
  if (existing) {
    const nextCoins = Number(student.coins || 0) - Number(existing.delta || 0);
    await client.query('UPDATE students SET coins = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2 AND deleted_at IS NULL', [
      nextCoins,
      grade.student_id,
    ]);
    await client.query('DELETE FROM student_coin_transactions WHERE transaction_id = $1', [existing.transaction_id]);
  }

  await client.query(
    `UPDATE grades
     SET base_coin = 0,
         total_daily_coin = 0,
         coin_comment = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE grade_id = $1`,
    [grade.grade_id]
  );

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

  const resolvedCenterId = centerId ?? body.center_id;
  if (resolvedCenterId) {
    const classOk = await classInCenter(class_id, resolvedCenterId);
    if (!classOk) return { error: 'invalid_center' as const };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const attendanceRows: any[] = [];
    const gradeRows: any[] = [];
    const coinRows: any[] = [];

    for (const record of records) {
      const studentId = Number(record.student_id);
      if (!studentId) throw new Error('student_id is required for every record');

      if (resolvedCenterId) {
        const studentRes = await client.query(
          'SELECT student_id FROM students WHERE student_id = $1 AND center_id = $2 AND deleted_at IS NULL',
          [studentId, resolvedCenterId]
        );
        if (studentRes.rowCount === 0) throw new Error(`Student ${studentId} does not belong to this center.`);
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
        const coinRow = await upsertLessonCoinsInTransaction(client, gradeRow, teacher_id ?? null);
        if (coinRow?.error) throw new Error(`Failed to save coins for student ${studentId}: ${coinRow.error}`);
        coinRows.push(coinRow);
      } else {
        await clearLessonCoinsInTransaction(client, gradeRow);
      }
    }

    await client.query('COMMIT');
    return { attendance: attendanceRows, grades: gradeRows, coins: coinRows };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
