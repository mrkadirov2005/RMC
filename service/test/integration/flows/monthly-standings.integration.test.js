const request = require('supertest');

// A group's standings (the teacher's "points" column and the order of the students) count only one
// month's lessons: this Tashkent month by default, another with ?month=YYYY-MM. Coins are untouched.
describe('monthly group standings with PostgreSQL', () => {
  let pool;
  let server;
  let classId;
  let anna;
  let bob;
  let teacher;

  const monthOf = (offset) => {
    const [year, month] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' })
      .format(new Date())
      .split('-')
      .map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return date.toISOString().slice(0, 7);
  };
  const thisMonth = monthOf(0);
  const lastMonth = monthOf(-1);

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers RESTART IDENTITY CASCADE');
    const centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Stand Center', 'ST-C') RETURNING center_id`)).rows[0].center_id;
    const teacherId = (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'ST-T', 'T', 'T') RETURNING teacher_id`, [centerId])).rows[0].teacher_id;
    classId = (await pool.query(`INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'A1', 'ST-A1', $2) RETURNING class_id`, [centerId, teacherId])).rows[0].class_id;
    const student = async (code) =>
      (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, coins)
         VALUES ($1, $2, $2, 'S', $3, $4, 'Active', 40) RETURNING student_id`,
        [centerId, code, classId, teacherId]
      )).rows[0].student_id;
    anna = await student('Anna');
    bob = await student('Bob');
    const lesson = async (date, scores) => {
      const sessionId = (await pool.query(
        `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time)
         VALUES ($1, $2, $3, $4, '09:00', 60, '10:00') RETURNING session_id`,
        [centerId, classId, teacherId, date]
      )).rows[0].session_id;
      for (const [studentId, points] of scores) {
        await pool.query(
          `INSERT INTO grades (center_id, student_id, class_id, session_id, teacher_id, points_score, total_daily_coin)
           VALUES ($1, $2, $3, $4, $5, $6, 5)`,
          [centerId, studentId, classId, sessionId, teacherId, points]
        );
      }
    };
    // Last month Bob was far ahead; this month Anna is. (Attendance is 0, so a 100-point score
    // counts at 60%: see grades/services/lessonScore.ts.)
    await lesson(`${lastMonth}-10`, [[anna, 10], [bob, 100]]);
    await lesson(`${lastMonth}-17`, [[anna, 10], [bob, 100]]);
    await lesson(`${thisMonth}-01`, [[anna, 90], [bob, 40]]);

    const { generateToken } = require('../../../src/middleware/auth');
    teacher = generateToken({ id: teacherId, userType: 'teacher', role: 'teacher', center_id: centerId, username: 'st' });
    const { createApp } = require('../../../src/index');
    const app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections?.();
      await new Promise((resolve) => server.close(resolve));
    }
    if (pool) await pool.end();
  });

  const standings = (query = '') =>
    request(server).get(`/api/grades/class/${classId}/standings${query}`).set({ Authorization: `Bearer ${teacher}` });

  test("counts only this month's lessons by default", async () => {
    const rows = (await standings()).body;
    expect(rows).toEqual([
      expect.objectContaining({ student_id: anna, total_points: 54, lessons: 1, place: 1 }),
      expect.objectContaining({ student_id: bob, total_points: 24, lessons: 1, place: 2 }),
    ]);
  });

  test('another month on request; a malformed month falls back to this one', async () => {
    const rows = (await standings(`?month=${lastMonth}`)).body;
    expect(rows).toEqual([
      expect.objectContaining({ student_id: bob, total_points: 120, lessons: 2, place: 1 }),
      expect.objectContaining({ student_id: anna, total_points: 12, lessons: 2, place: 2 }),
    ]);
    expect((await standings('?month=2026-13')).body[0]).toMatchObject({ student_id: anna, total_points: 54 });
  });

  test('coins stay as they were', async () => {
    const coins = (await pool.query('SELECT student_id, coins FROM students ORDER BY student_id')).rows.map((row) => Number(row.coins));
    expect(coins).toEqual([40, 40]);
  });
});
