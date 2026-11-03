const request = require('supertest');

// The salary list: per teacher, what their students should pay in the salary month and what they
// paid (the same calculation as Dashboard → To'lovlar), next to the salary and its advances.
describe('salary list with PostgreSQL', () => {
  let pool;
  let server;
  let admin;
  let teacherA;
  let teacherB;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers RESTART IDENTITY CASCADE');
    const centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Sal Center', 'SL-C') RETURNING center_id`)).rows[0].center_id;
    const teacher = async (code) =>
      (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, $2, $2, 'T') RETURNING teacher_id`, [centerId, code])).rows[0].teacher_id;
    teacherA = await teacher('Alisher');
    teacherB = await teacher('Bekzod');
    const group = async (name, teacherId, fee) =>
      (await pool.query(
        `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, $2, $2, $3, $4) RETURNING class_id`,
        [centerId, name, teacherId, fee]
      )).rows[0].class_id;
    const a1 = await group('SL-A1', teacherA, 500000);
    const b1 = await group('SL-B1', teacherB, 400000);
    const student = async (code, classId, teacherId) =>
      (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, start_date)
         VALUES ($1, $2, $2, 'S', $3, $4, 'Active', '2026-09-01') RETURNING student_id`,
        [centerId, code, classId, teacherId]
      )).rows[0].student_id;
    const s1 = await student('SL-1', a1, teacherA);
    const s2 = await student('SL-2', a1, teacherA);
    await student('SL-3', b1, teacherB);
    const pay = (studentId, amount) =>
      pool.query(
        `INSERT INTO payments (center_id, student_id, payment_date, amount, original_amount, final_amount, payment_status, is_complete)
         VALUES ($1, $2, '2026-10-05', $3, 500000, $3, 'Completed', $4)`,
        [centerId, studentId, amount, amount >= 500000]
      );
    await pay(s1, 500000);
    await pay(s2, 250000);

    const { generateToken } = require('../../../src/middleware/auth');
    admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
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

  test("each teacher's students: expected, collected and how many paid, in the salary month", async () => {
    const res = await request(server).get('/api/salaries?year=2026&month=10').set({ Authorization: `Bearer ${admin}` });
    expect(res.status).toBe(200);
    const byId = new Map(res.body.teachers.map((row) => [row.teacher_id, row]));
    expect(byId.get(teacherA).payment_progress).toEqual({
      students: 2,
      paid_students: 1,
      partial_students: 1,
      unpaid_students: 0,
      expected: 1000000,
      collected: 750000,
      remaining: 250000,
    });
    expect(byId.get(teacherB).payment_progress).toMatchObject({ students: 1, unpaid_students: 1, expected: 400000, collected: 0 });
  });

  test('advances and the paid salary show on the same row; each is a kassa expense', async () => {
    const auth = { Authorization: `Bearer ${admin}` };
    const advance = await request(server).post('/api/salaries/advances').set(auth).send({ teacher_id: teacherA, salary_year: 2026, salary_month: 10, amount: 200000, payment_method: 'Cash' });
    expect(advance.status).toBeLessThan(300);
    const paid = await request(server).post('/api/salaries/mark-paid').set(auth).send({ teacher_id: teacherA, salary_year: 2026, salary_month: 10, amount: 1000000, payment_method: 'Cash' });
    expect(paid.status).toBeLessThan(300);

    const row = (await request(server).get('/api/salaries?year=2026&month=10').set(auth)).body.teachers.find((item) => item.teacher_id === teacherA);
    expect(row.advance_total).toBe(200000);
    expect(row.salary).toMatchObject({ is_paid: true });
    expect(Number(row.salary.amount)).toBe(1000000);
    // The kassa: the advance, then the rest of the salary.
    const spent = (await pool.query('SELECT amount, description FROM expenses WHERE deleted_at IS NULL ORDER BY expense_id')).rows;
    expect(spent.map((item) => Number(item.amount))).toEqual([200000, 800000]);
  });
});
