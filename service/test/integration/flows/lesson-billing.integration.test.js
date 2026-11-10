const request = require('supertest');

// A month's price covers 12 lessons: a student who joins or leaves partway through a month pays
// price / 12 for each of the group's lesson days they were in the group (at most 12).
describe('billing by lessons with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  let groupId;
  let token;
  const students = {};
  const MWF = JSON.stringify({ days: ['Monday', 'Wednesday', 'Friday'], time: '14:00', endTime: '15:30' });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, class_price_history, payments RESTART IDENTITY CASCADE');
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Lesson Center', 'LES-C') RETURNING center_id`)).rows[0].center_id;
    const teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'LS-T', 'Kifoyat', 'N') RETURNING teacher_id`, [centerId],
    )).rows[0].teacher_id;
    groupId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount, section) VALUES ($1, 'Movers', 'LS-M', $2, 320000, $3) RETURNING class_id`,
      [centerId, teacherId, MWF],
    )).rows[0].class_id;
    const student = async (key, start, end, status = 'Active') => {
      students[key] = (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, start_date, end_date)
         VALUES ($1, $2, $2, 'Test', $3, $4, $5, $6, $7) RETURNING student_id`,
        [centerId, key, groupId, teacherId, status, start, end],
      )).rows[0].student_id;
    };
    await student('whole', null, null);
    await student('joined', '2026-10-06', null);
    await student('late', '2026-10-26', null);
    await student('left', null, '2026-10-05', 'Transferred');
    await pool.query(
      `INSERT INTO payments (student_id, center_id, payment_date, amount, original_amount, currency, payment_method, payment_status, payment_type, receipt_number)
       VALUES ($1, $2, '2026-10-31', 300000, 300000, 'UZS', 'Cash', 'Completed', 'Tuition', 'LS-1')`,
      [students.joined, centerId],
    );

    const { createApp } = require('../../../src/index');
    const expressApp = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = expressApp.listen(0, '127.0.0.1', () => resolve(listener));
    });
    token = require('../../../src/middleware/auth').generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  const share = async (section, start, end, month) =>
    Number((await pool.query('SELECT billing_month_share($1, $2::date, $3::date, $4::date) AS s', [section, start, end, month])).rows[0].s);

  test('billing_month_share counts the lesson days, at most 12', async () => {
    // October 2026 has 13 Mon/Wed/Fri lesson days.
    expect(await share(MWF, null, null, '2026-10-01')).toBe(1);
    expect(await share(MWF, '2026-10-06', null, '2026-10-01')).toBeCloseTo(11 / 12, 6);
    expect(await share(MWF, '2026-10-02', null, '2026-10-01')).toBe(1);
    expect(await share(MWF, null, '2026-10-05', '2026-10-01')).toBeCloseTo(2 / 12, 6);
    expect(await share(MWF, '2026-11-01', null, '2026-10-01')).toBe(0);
    // No lesson days in the schedule: calendar days.
    expect(await share('', '2026-10-06', null, '2026-10-01')).toBeCloseTo(26 / 31, 6);
  });

  test("To'lovlar bills a partial month by lessons", async () => {
    const res = await request(server).get('/api/payments/students-summary')
      .query({ from: '2026-10-01', to: '2026-10-31', class_id: groupId }).set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    const rows = Object.fromEntries((res.body.rows || res.body.items || []).map((row) => [row.student_id, row]));
    expect(Number(rows[students.whole].expected)).toBe(320000);
    expect(Number(rows[students.joined].expected)).toBeCloseTo(293333.33, 1);
    // 300 000 paid covers 11 lessons (293 333).
    expect(rows[students.joined].state).toBe('paid');
    expect(Number(rows[students.late].expected)).toBeCloseTo(80000, 1);
    if (rows[students.left]) expect(Number(rows[students.left].expected)).toBeCloseTo(53333.33, 1);
  });
});
