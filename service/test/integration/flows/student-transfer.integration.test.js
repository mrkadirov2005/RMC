const { todayInCenterTimeZone, toDateOnly } = require('../../../src/utils/transferAllocation');

describe('student transfer between groups with PostgreSQL', () => {
  let pool;
  let studentRepository;
  let attendanceService;
  let gradeService;
  let centerId;
  let teacherId;
  let oldClassId;
  let newClassId;
  let reasonId;

  const today = todayInCenterTimeZone();
  const todayKey = toDateOnly(today);
  const monthStartKey = toDateOnly(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const lastMonthEndKey = toDateOnly(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)));
  const yesterdayKey = toDateOnly(new Date(today.getTime() - 24 * 60 * 60 * 1000));
  const tomorrowKey = toDateOnly(new Date(today.getTime() + 24 * 60 * 60 * 1000));
  const totalDays = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

  const insertStudent = async (enrollment, classId, extra = '') => (await pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status${extra ? ', end_date' : ''})
     VALUES ($1, $2, 'Ali', 'Valiyev', $3, $4, ${extra ? `'Transferred', $5` : `'Active'`}) RETURNING student_id`,
    extra ? [centerId, enrollment, classId, teacherId, extra] : [centerId, enrollment, classId, teacherId]
  )).rows[0].student_id;

  const pay = (studentId, amount) => pool.query(
    `INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, payment_status, payment_type)
     VALUES ($1, $2, $3, $4, 'UZS', 'Cash', 'Completed', 'Tuition')`,
    [studentId, centerId, monthStartKey, amount]
  );

  const paidTotal = async (studentId) => Number((await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM payments
     WHERE student_id = $1 AND deleted_at IS NULL AND payment_date >= $2`,
    [studentId, monthStartKey]
  )).rows[0].total);

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Transfer Center', 'TRF-A') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'TRF-T', 'Test', 'Teacher') RETURNING teacher_id`, [centerId]
    )).rows[0].teacher_id;
    oldClassId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, 'Old Group', 'TRF-OLD', $2, 600000) RETURNING class_id`, [centerId, teacherId]
    )).rows[0].class_id;
    newClassId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, 'New Group', 'TRF-NEW', $2, 450000) RETURNING class_id`, [centerId, teacherId]
    )).rows[0].class_id;
    reasonId = (await pool.query(
      `INSERT INTO student_action_reasons (reason_type, reason_code, reason_name, active)
       VALUES ('transfer', 'moved_group', 'Moved group', true)
       ON CONFLICT (reason_type, reason_code) DO UPDATE SET active = true
       RETURNING reason_id`
    )).rows[0].reason_id;
    studentRepository = require('../../../src/modules/students/repositories/student.repository');
    attendanceService = require('../../../src/modules/attendance/services/attendance.service');
    gradeService = require('../../../src/modules/grades/services/grade.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('splits the month by days and moves money without creating or losing any', async () => {
    const studentId = await insertStudent('TRF-1', oldClassId);
    await pay(studentId, 600000);

    const result = await studentRepository.transferToClass(studentId, newClassId, reasonId, centerId);
    const newId = result.student.student_id;

    const earned = round((600000 * (today.getUTCDate() - 1)) / totalDays);
    expect(result.payment_allocation).toMatchObject({
      transfer_date: todayKey,
      source_earned_amount: earned,
      moved_amount: round(600000 - earned),
      target_charge_amount: round((450000 * (totalDays - today.getUTCDate() + 1)) / totalDays),
    });
    expect(await paidTotal(studentId)).toBeCloseTo(earned, 2);
    expect(await paidTotal(studentId) + await paidTotal(newId)).toBeCloseTo(600000, 2);

    const rows = (await pool.query(
      `SELECT student_id, status, start_date::text, end_date::text, transferred_from_student_id FROM students WHERE student_id IN ($1, $2) ORDER BY student_id`,
      [studentId, newId]
    )).rows;
    expect(rows).toEqual([
      { student_id: studentId, status: 'Transferred', start_date: null, end_date: yesterdayKey, transferred_from_student_id: null },
      { student_id: newId, status: 'Active', start_date: todayKey, end_date: null, transferred_from_student_id: studentId },
    ]);
  });

  test('keeps a transfer from this month on the old roster and drops one from last month', async () => {
    const fromThisMonth = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'TRF-1' AND class_id = $1`, [oldClassId])).rows[0].student_id;
    const fromLastMonth = await insertStudent('TRF-2', oldClassId, lastMonthEndKey);
    const legacy = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status)
       VALUES ($1, 'TRF-3', 'Old', 'Transfer', $2, 'Transferred') RETURNING student_id`, [centerId, oldClassId]
    )).rows[0].student_id;

    const roster = (await studentRepository.findByClassIncludingTransferred(oldClassId, centerId)).map((row) => row.student_id);
    const listed = (await studentRepository.findPaginatedWithClass({ class_id: oldClassId, limit: 100 }, centerId)).data.map((row) => row.student_id);

    for (const ids of [roster, listed]) {
      if (today.getUTCDate() === 1) expect(ids).not.toContain(fromThisMonth);
      else expect(ids).toContain(fromThisMonth);
      expect(ids).not.toContain(fromLastMonth);
      // Transfers made before end dates existed are listed exactly as they were.
      expect(ids).toContain(legacy);
    }
  });

  test('refuses attendance after the student left but allows it on their last day', async () => {
    const oldId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'TRF-1' AND class_id = $1`, [oldClassId])).rows[0].student_id;
    const base = { student_id: oldId, teacher_id: teacherId, class_id: oldClassId, status: 'Present' };

    await expect(attendanceService.create({ ...base, attendance_date: todayKey }, centerId)).resolves.toEqual({ error: 'student_left_group' });
    const kept = await attendanceService.create({ ...base, attendance_date: yesterdayKey }, centerId);
    expect(kept.error).toBeUndefined();
  });

  test('a lesson after the transfer skips the student who left and saves everyone else', async () => {
    const oldId = (await pool.query(`SELECT student_id FROM students WHERE enrollment_number = 'TRF-1' AND class_id = $1`, [oldClassId])).rows[0].student_id;
    const stayingId = await insertStudent('TRF-4', oldClassId);
    const sessionId = (await pool.query(
      `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time)
       VALUES ($1, $2, $3, $4, '09:00', 60, '10:00') RETURNING session_id`, [centerId, oldClassId, teacherId, tomorrowKey]
    )).rows[0].session_id;

    const result = await gradeService.saveSessionWorkflow({
      center_id: centerId, class_id: oldClassId, session_id: sessionId, teacher_id: teacherId,
      attendance_date: tomorrowKey, subject: 'Lesson', total_marks: 100, award_coins: false,
      records: [
        { student_id: oldId, attendance_status: 'Present', attendance_score: 50 },
        { student_id: stayingId, attendance_status: 'Present', attendance_score: 50 },
      ],
    }, centerId);

    expect(result.skipped_student_ids).toEqual([oldId]);
    expect(result.attendance.map((row) => row.student_id)).toEqual([stayingId]);
  });
});
