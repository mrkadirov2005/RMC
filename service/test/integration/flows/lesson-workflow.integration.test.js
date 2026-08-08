describe('transactional lesson workflow with PostgreSQL', () => {
  let pool;
  let gradeService;
  let centerId;
  let otherCenterId;
  let teacherId;
  let classId;
  let sessionId;
  let student1;
  let student2;
  let outsider;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Lesson Center', 'LESSON-A') RETURNING center_id`)).rows[0].center_id;
    otherCenterId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Other Center', 'LESSON-B') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'LESSON-T', 'Test', 'Teacher') RETURNING teacher_id`, [centerId]
    )).rows[0].teacher_id;
    classId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'Lesson Class', 'LESSON-C', $2) RETURNING class_id`, [centerId, teacherId]
    )).rows[0].class_id;
    sessionId = (await pool.query(
      `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time)
       VALUES ($1, $2, $3, '2026-08-08', '09:00', 60, '10:00') RETURNING session_id`, [centerId, classId, teacherId]
    )).rows[0].session_id;
    student1 = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id) VALUES ($1, 'LESSON-S1', 'One', 'Student', $2, $3) RETURNING student_id`, [centerId, classId, teacherId]
    )).rows[0].student_id;
    student2 = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id) VALUES ($1, 'LESSON-S2', 'Two', 'Student', $2, $3) RETURNING student_id`, [centerId, classId, teacherId]
    )).rows[0].student_id;
    outsider = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name) VALUES ($1, 'LESSON-OUT', 'Other', 'Student') RETURNING student_id`, [otherCenterId]
    )).rows[0].student_id;
    gradeService = require('../../../src/modules/grades/services/grade.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  const payload = (records, awardCoins = true) => ({
    center_id: centerId, class_id: classId, session_id: sessionId, teacher_id: teacherId,
    attendance_date: '2026-08-08', subject: 'Integrated Lesson', total_marks: 100, award_coins: awardCoins, records,
  });

  test('saves attendance, grades, and one source coin transaction per student atomically', async () => {
    const result = await gradeService.saveSessionWorkflow(payload([
      { student_id: student1, attendance_status: 'Present', attendance_score: 50, homework_score: 20, activity_score: 30, points_score: 0, is_stellar_student: true },
      { student_id: student2, attendance_status: 'Late', attendance_score: 40, homework_score: 20, activity_score: 20, points_score: 0 },
    ]), centerId);
    expect(result.attendance).toHaveLength(2); expect(result.grades).toHaveLength(2); expect(result.coins).toHaveLength(2);

    const attendance = (await pool.query('SELECT student_id, status FROM attendance WHERE session_id = $1 ORDER BY student_id', [sessionId])).rows;
    expect(attendance).toEqual([{ student_id: student1, status: 'Present' }, { student_id: student2, status: 'Late' }]);
    const grades = (await pool.query('SELECT student_id, marks_obtained::float, percentage::float, total_daily_coin FROM grades WHERE session_id = $1 ORDER BY student_id', [sessionId])).rows;
    expect(grades).toEqual([
      { student_id: student1, marks_obtained: 100, percentage: 100, total_daily_coin: 50 },
      { student_id: student2, marks_obtained: 80, percentage: 80, total_daily_coin: 5 },
    ]);
    const coins = (await pool.query('SELECT student_id, coins FROM students WHERE student_id = ANY($1::int[]) ORDER BY student_id', [[student1, student2]])).rows;
    expect(coins).toEqual([{ student_id: student1, coins: 50 }, { student_id: student2, coins: 5 }]);
  });

  test('re-saving corrects existing rows and coin balance by delta without duplication', async () => {
    await gradeService.saveSessionWorkflow(payload([
      { student_id: student1, attendance_status: 'Absent R', attendance_score: 30, homework_score: 20, activity_score: 20, points_score: 0 },
    ]), centerId);
    const grade = (await pool.query('SELECT marks_obtained::float, total_daily_coin FROM grades WHERE student_id = $1 AND session_id = $2', [student1, sessionId])).rows[0];
    expect(grade).toEqual({ marks_obtained: 70, total_daily_coin: 1 });
    const balance = (await pool.query('SELECT coins FROM students WHERE student_id = $1', [student1])).rows[0].coins;
    expect(balance).toBe(1);
    const counts = (await pool.query(
      `SELECT (SELECT COUNT(*)::int FROM attendance WHERE student_id=$1 AND session_id=$2) attendance_count,
              (SELECT COUNT(*)::int FROM grades WHERE student_id=$1 AND session_id=$2) grade_count,
              (SELECT COUNT(*)::int FROM student_coin_transactions WHERE student_id=$1 AND source_type='lesson_session' AND source_id=$2) coin_count`,
      [student1, sessionId]
    )).rows[0];
    expect(counts).toEqual({ attendance_count: 1, grade_count: 1, coin_count: 1 });
  });

  test('disabling coin awards reverses the prior source award', async () => {
    await gradeService.saveSessionWorkflow(payload([
      { student_id: student1, attendance_status: 'Present', attendance_score: 50, homework_score: 20, activity_score: 30, points_score: 0 },
    ], false), centerId);
    expect((await pool.query('SELECT coins FROM students WHERE student_id=$1', [student1])).rows[0].coins).toBe(0);
    expect(Number((await pool.query(`SELECT COUNT(*) count FROM student_coin_transactions WHERE student_id=$1 AND source_type='lesson_session' AND source_id=$2`, [student1, sessionId])).rows[0].count)).toBe(0);
  });

  test('a later invalid student rolls back earlier attendance, grade, and coin changes', async () => {
    const before = (await pool.query('SELECT marks_obtained::float, total_daily_coin FROM grades WHERE student_id=$1 AND session_id=$2', [student2, sessionId])).rows[0];
    await expect(gradeService.saveSessionWorkflow(payload([
      { student_id: student2, attendance_status: 'Absent', attendance_score: 0, homework_score: 0, activity_score: 0, points_score: 0 },
      { student_id: outsider, attendance_status: 'Present', attendance_score: 50, homework_score: 20, activity_score: 30, points_score: 0 },
    ]), centerId)).rejects.toThrow('does not belong to this center');
    const after = (await pool.query('SELECT marks_obtained::float, total_daily_coin FROM grades WHERE student_id=$1 AND session_id=$2', [student2, sessionId])).rows[0];
    expect(after).toEqual(before);
    expect((await pool.query('SELECT status FROM attendance WHERE student_id=$1 AND session_id=$2', [student2, sessionId])).rows[0].status).toBe('Late');
  });
});
