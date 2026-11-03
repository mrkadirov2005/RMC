const request = require('supertest');

// A month's salary is the teacher's pay rate of the money that came in for it. A payment for an
// earlier month that came in late counts in the month it was entered (Tashkent time), never back
// in the month it was for.
describe('salary by pay rate with late payments', () => {
  let pool;
  let server;
  let admin;
  let teacherId;
  let lateStudent;
  let centerId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers RESTART IDENTITY CASCADE');
    // Kassa expenses are not tied to the center rows; clear what other test files left.
    await pool.query('TRUNCATE TABLE expenses RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Rate Center', 'RT-C') RETURNING center_id`)).rows[0].center_id;
    teacherId = (
      await pool.query(
        `INSERT INTO teachers (center_id, employee_id, first_name, last_name, salary_percentage) VALUES ($1, 'RT-T', 'Rano', 'T', 50) RETURNING teacher_id`,
        [centerId]
      )
    ).rows[0].teacher_id;
    const classId = (
      await pool.query(
        `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, 'RT-A1', 'RT-A1', $2, 500000) RETURNING class_id`,
        [centerId, teacherId]
      )
    ).rows[0].class_id;
    const student = async (code) =>
      (
        await pool.query(
          `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, start_date)
           VALUES ($1, $2, $2, 'S', $3, $4, 'Active', '2026-09-01') RETURNING student_id`,
          [centerId, code, classId, teacherId]
        )
      ).rows[0].student_id;
    const pay = (studentId, forDay, amount, enteredUtc) =>
      pool.query(
        `INSERT INTO payments (center_id, student_id, payment_date, amount, original_amount, final_amount, payment_status, is_complete, created_at)
         VALUES ($1, $2, $3, $4, 500000, $4, 'Completed', true, $5)`,
        [centerId, studentId, forDay, amount, enteredUtc]
      );
    const onTime = await student('Olim');
    lateStudent = await student('Kamol');
    const november = await student('Nodir');
    const midnight = await student('Yarim');
    await pay(onTime, '2026-10-05', 500000, '2026-10-05 08:00:00');
    // October's fee, paid on 3 November.
    await pay(lateStudent, '2026-10-01', 500000, '2026-11-03 09:00:00');
    await pay(november, '2026-11-02', 500000, '2026-11-02 09:00:00');
    // 31 October 20:00 UTC is already 1 November in Tashkent.
    await pay(midnight, '2026-10-10', 300000, '2026-10-31 20:00:00');
    // Before the salary start month: never part of a salary.
    await pay(onTime, '2026-09-05', 500000, '2026-10-02 08:00:00');

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

  const row = async (month) =>
    (await request(server).get(`/api/salaries?year=2026&month=${month}`).set({ Authorization: `Bearer ${admin}` })).body.teachers.find(
      (item) => item.teacher_id === teacherId
    );

  test('October pays only for money that came in during October', async () => {
    expect((await row(10)).earnings).toEqual({
      rate: 50,
      on_time_amount: 500000,
      late_amount: 0,
      base_amount: 500000,
      due: 250000,
      paying_students: 1,
      late_count: 0,
    });
  });

  test("November adds October's late payments to its own", async () => {
    expect((await row(11)).earnings).toMatchObject({
      on_time_amount: 500000,
      late_amount: 800000,
      base_amount: 1300000,
      due: 650000,
      late_count: 2,
    });
  });

  test("the teacher's page lists the late payments with the month they were for", async () => {
    const res = await request(server).get(`/api/salaries/teacher/${teacherId}/payments?month=2026-11`).set({ Authorization: `Bearer ${admin}` });
    expect(res.status).toBe(200);
    const late = res.body.earnings.late_payments;
    expect(late.map((item) => [item.for_month, item.amount, item.teacher_share])).toEqual([
      ['2026-10', 300000, 150000],
      ['2026-10', 500000, 250000],
    ]);
    expect(late.find((item) => item.student_id === lateStudent).name).toBe('Kamol S');
  });

  describe('giving the salary in parts', () => {
    const auth = () => ({ Authorization: `Bearer ${admin}` });
    const give = (kind, amount) =>
      request(server).post('/api/salaries/advances').set(auth()).send({ teacher_id: teacherId, salary_year: 2026, salary_month: 10, amount, payment_method: 'Cash', kind });
    const spent = async () => (await pool.query('SELECT amount, description FROM expenses WHERE deleted_at IS NULL AND center_id = $1 ORDER BY expense_id', [centerId])).rows;

    test('an advance, then the salary in parts, never more than what is left of the salary by rate', async () => {
      // October: 50% of 500 000 = 250 000.
      expect((await give('advance', 100000)).status).toBe(201);
      const over = await give('salary', 200000);
      expect(over.status).toBe(400);
      expect(over.body.left).toBe(150000);

      expect((await give('salary', 100000)).status).toBe(201);
      let october = await row(10);
      expect(october).toMatchObject({ advance_total: 100000, salary_paid_total: 100000 });
      expect(october.salary).toMatchObject({ is_paid: false, from_payouts: true });
      expect(Number(october.salary.amount)).toBe(200000);

      expect((await give('salary', 50000)).status).toBe(201);
      october = await row(10);
      expect(october.salary.is_paid).toBe(true);
      expect((await give('salary', 1)).status).toBe(400);

      // Every part is its own kassa expense, and nothing is paid out twice.
      const out = await spent();
      expect(out.map((item) => Number(item.amount))).toEqual([100000, 100000, 50000]);
      expect(out.map((item) => item.description.split(':')[0])).toEqual(['Avans', 'Maosh', 'Maosh']);
    });

    test('taking a part back gives the money back and the month is not paid in full any more', async () => {
      const last = (await pool.query(`SELECT advance_id FROM teacher_salary_advances WHERE kind = 'salary' ORDER BY advance_id DESC LIMIT 1`)).rows[0].advance_id;
      expect((await request(server).delete(`/api/salaries/advances/${last}`).set(auth())).status).toBe(200);
      const october = await row(10);
      expect(october).toMatchObject({ advance_total: 100000, salary_paid_total: 100000 });
      expect(october.salary.is_paid).toBe(false);
      expect((await spent()).map((item) => Number(item.amount))).toEqual([100000, 100000]);
    });
  });
});
