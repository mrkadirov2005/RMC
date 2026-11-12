// The calendar follows the group's timetable: future lessons nobody scored are rebuilt from the
// timetable, while scored lessons and past lessons are kept.
describe('calendar sync with PostgreSQL', () => {
  let pool;
  let centerId;
  let classId;
  let teacherId;
  const NOW = new Date('2026-11-12T06:00:00Z'); // Thursday 12 November 2026 in Tashkent

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, payments RESTART IDENTITY CASCADE');
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Calendar Center', 'CAL-C') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'CAL-T', 'Temur', 'T') RETURNING teacher_id`, [centerId])).rows[0].teacher_id;
    classId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount, start_date, end_date, section)
       VALUES ($1, 'A1 morning', 'CAL-1', $2, 300000, '2026-09-01', '2026-12-31', $3) RETURNING class_id`,
      [centerId, teacherId, JSON.stringify({ days: ['Monday', 'Wednesday', 'Friday'], time: '09:00', endTime: '10:30' })],
    )).rows[0].class_id;
    const session = (date, time = '09:00') => pool.query(
      `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, end_time, duration_minutes) VALUES ($1, $2, $3, $4, $5, '23:00', 90) RETURNING session_id`,
      [centerId, classId, teacherId, date, time],
    ).then((r) => r.rows[0].session_id);
    // Past lesson (kept), a stray future Tuesday lesson nobody scored (removed), and a future lesson
    // already scored (kept even though Saturday is not in the timetable).
    await session('2026-11-09');
    await session('2026-11-17', '15:00');
    const scored = await session('2026-11-21');
    const studentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, status) VALUES ($1, 'CAL-S', 'Ali', 'V', $2, 'Active') RETURNING student_id`,
      [centerId, classId],
    )).rows[0].student_id;
    await pool.query(`INSERT INTO grades (center_id, student_id, class_id, teacher_id, session_id, subject, marks_obtained, total_marks) VALUES ($1, $2, $3, $4, $5, 'English', 80, 100)`,
      [centerId, studentId, classId, teacherId, scored]);
  });

  afterAll(async () => {
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  const dates = async () => (await pool.query(
    `SELECT session_date::text AS d FROM sessions WHERE class_id = $1 AND deleted_at IS NULL ORDER BY session_date`, [classId],
  )).rows.map((row) => row.d);

  test('removes the stray unscored lesson, keeps scored and past ones, and fills the timetable', async () => {
    const sessionService = require('../../../src/modules/sessions/services/session.service');
    const out = await sessionService.syncCalendarWithTimetable({ classId, centerId, now: NOW });
    expect(out).toMatchObject({ removed: 1, from: '2026-11-12' });
    const all = await dates();
    expect(all).toContain('2026-11-09'); // past
    expect(all).toContain('2026-11-21'); // scored
    expect(all).not.toContain('2026-11-17'); // stray Tuesday
    // Every Monday, Wednesday and Friday from today to the group's end date.
    expect(all).toEqual(expect.arrayContaining(['2026-11-13', '2026-11-16', '2026-11-18', '2026-12-30']));
    expect(all.some((d) => d > '2026-12-31')).toBe(false);
  });

  test('running it again changes nothing', async () => {
    const before = await dates();
    const sessionService = require('../../../src/modules/sessions/services/session.service');
    const out = await sessionService.syncCalendarWithTimetable({ classId, centerId, now: NOW });
    expect(out.created).toBe(0);
    expect(await dates()).toEqual(before);
  });
});
