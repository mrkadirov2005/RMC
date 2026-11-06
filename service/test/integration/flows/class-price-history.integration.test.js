const request = require('supertest');

// A group's price over time: months are billed at the price in effect for them, so raising a
// price doesn't turn months already paid at the old price into debts.
describe('group price history with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  let teacherId;
  let raised; // paid 300 000 for three months; the raise to 350 000 was typed into the group
  let quiet; // the same, nobody has paid the new price yet
  const students = {};
  const tokens = {};

  const api = () => request(server);
  const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

  // Months relative to now, as YYYY-MM-01 in Tashkent.
  const monthStart = (offset) => {
    const now = new Date(Date.now() + 5 * 3600 * 1000);
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return date.toISOString().slice(0, 10);
  };
  const lastDay = (offset) => {
    const start = new Date(`${monthStart(offset + 1)}T00:00:00Z`);
    start.setUTCDate(0);
    return start.toISOString().slice(0, 10);
  };
  const day = (offset, d = 5) => `${monthStart(offset).slice(0, 8)}${String(d).padStart(2, '0')}`;

  const pay = (studentId, date, amount) => pool.query(
    `INSERT INTO payments (student_id, center_id, payment_date, amount, original_amount, currency, payment_method, payment_status, payment_type, receipt_number)
     VALUES ($1, $2, $3, $4, $4, 'UZS', 'Cash', 'Completed', 'Tuition', $5)`,
    [studentId, centerId, date, amount, `R-${studentId}-${date}-${amount}-${Math.random()}`],
  );

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, class_price_history, payments RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Price Center', 'PRICE-C') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'PR-T', 'Temur', 'Aliyev') RETURNING teacher_id`, [centerId],
    )).rows[0].teacher_id;
    const makeClass = async (name) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, $2, $3, $4, 350000) RETURNING class_id`,
      [centerId, name, `PR-${name}`, teacherId],
    )).rows[0].class_id;
    raised = await makeClass('Raised');
    quiet = await makeClass('Quiet');
    const student = async (key, classId) => {
      students[key] = (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, start_date)
         VALUES ($1, $2, $2, 'Test', $3, $4, 'Active', $5) RETURNING student_id`,
        [centerId, key, classId, teacherId, monthStart(-6)],
      )).rows[0].student_id;
    };
    for (const key of ['ali', 'vali', 'sora']) await student(key, raised);
    for (const key of ['nodir', 'lola']) await student(key, quiet);

    // Three months at 300 000 in both groups, one student paying in two halves.
    for (const offset of [-3, -2, -1]) {
      await pay(students.ali, day(offset), 300000);
      await pay(students.vali, day(offset), 300000);
      await pay(students.sora, day(offset, 3), 150000);
      await pay(students.sora, day(offset, 20), 150000);
      await pay(students.nodir, day(offset), 300000);
      await pay(students.lola, day(offset), 300000);
    }
    // This month two students of "Raised" paid the new price.
    await pay(students.ali, day(0, 2), 350000);
    await pay(students.vali, day(0, 2), 350000);

    const { createApp } = require('../../../src/index');
    const expressApp = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = expressApp.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const { generateToken } = require('../../../src/middleware/auth');
    tokens.admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    tokens.teacher = generateToken({ id: teacherId, userType: 'teacher', center_id: centerId, username: 'temur' });
    tokens.student = generateToken({ id: students.ali, userType: 'student', center_id: centerId, class_id: raised, username: 'ali' });
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  const history = async (classId, who = 'admin') =>
    (await api().get(`/api/classes/${classId}/price-history`).set(auth(who))).body;

  const summary = async (classId, from, to) => {
    const res = await api().get('/api/payments/students-summary').query({ from, to, class_id: classId }).set(auth('admin'));
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.rows || res.body.items || []).map((row) => [row.student_id, row]));
  };

  test('the admin reverts the price in the group form, then raises it from the payments section', async () => {
    // Today's situation: the raise was typed into the group, so old months look part paid.
    const before = await summary(raised, monthStart(-3), lastDay(-1));
    expect(before[students.ali].state).toBe('partial');

    // 1. Back to 300 000 in the group form: allowed, the group has no price history yet.
    expect((await api().put(`/api/classes/${raised}`).set(auth('admin')).send({ payment_amount: 300000 })).status).toBe(200);
    const reverted = await summary(raised, monthStart(-3), lastDay(-1));
    expect(reverted[students.ali].state).toBe('paid');

    // 2. "Change group payment": 350 000 from this month.
    const change = await api().post(`/api/classes/${raised}/price-changes`).set(auth('admin'))
      .send({ amount: 350000, effective_month: monthStart(0).slice(0, 7), note: 'New books' });
    expect(change.status).toBe(201);
    expect(change.body.current_amount).toBe(350000);
    expect(change.body.entry).toMatchObject({ amount: 350000, previous_amount: 300000, note: 'New books', changed_by_name: 'admin1' });
    expect((await history(raised)).items.map((h) => [h.effective_from, h.amount, h.source])).toEqual([
      [monthStart(0).slice(0, 7), 350000, 'manual'],
      ['2000-01', 300000, 'initial'],
    ]);
    expect(Number((await pool.query('SELECT payment_amount FROM classes WHERE class_id = $1', [raised])).rows[0].payment_amount)).toBe(350000);
  });

  test('months paid at the old price stay paid after the raise', async () => {
    const rows = await summary(raised, monthStart(-3), lastDay(-1));
    for (const key of ['ali', 'vali', 'sora']) {
      expect(rows[students[key]].state).toBe('paid');
      expect(Number(rows[students[key]].expected)).toBe(900000);
    }
    // This month is billed at the new price.
    const now = await summary(raised, monthStart(0), lastDay(0));
    expect(now[students.ali].state).toBe('paid');
    expect(now[students.sora].state).toBe('unpaid');
    expect(Number(now[students.sora].expected)).toBe(350000);
    // Old and new months together: 3 x 300 000 + 350 000.
    const all = await summary(raised, monthStart(-3), lastDay(0));
    expect(Number(all[students.ali].expected)).toBe(1250000);
    expect(all[students.ali].state).toBe('paid');
  });

  test('after the first change, the group form cannot change the price', async () => {
    const res = await api().put(`/api/classes/${raised}`).set(auth('admin')).send({ payment_amount: 370000 });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PRICE_HAS_HISTORY');
    // Saving the form with the same price (other fields edited) still works.
    expect((await api().put(`/api/classes/${raised}`).set(auth('admin')).send({ payment_amount: 350000, section: 'A' })).status).toBe(200);
  });

  test('a price planned for next month waits for its month', async () => {
    await api().put(`/api/classes/${quiet}`).set(auth('admin')).send({ payment_amount: 300000 });
    const planned = await api().post(`/api/classes/${quiet}/price-changes`).set(auth('admin'))
      .send({ amount: 400000, effective_month: monthStart(1).slice(0, 7) });
    expect(planned.status).toBe(201);
    expect(planned.body.current_amount).toBe(300000);
    expect((await summary(quiet, monthStart(-3), lastDay(0)))[students.nodir].expected).toBe(1200000);
    // A missed change can be entered for an earlier month: from last month, 320 000.
    const late = await api().post(`/api/classes/${quiet}/price-changes`).set(auth('admin'))
      .send({ amount: 320000, effective_month: monthStart(-1).slice(0, 7) });
    expect(late.body.current_amount).toBe(320000);
    expect((await history(quiet)).items.map((h) => h.amount)).toEqual([400000, 320000, 300000]);
    // 2 x 300 000 + 320 000 (last month) + 320 000 (this month).
    expect((await summary(quiet, monthStart(-3), lastDay(0)))[students.nodir].expected).toBe(1240000);
  });

  test('only admins change prices; students cannot see them', async () => {
    const teacherChange = await api().post(`/api/classes/${raised}/price-changes`).set(auth('teacher')).send({ amount: 1 });
    expect(teacherChange.status).toBe(403);
    expect((await api().get(`/api/classes/${raised}/price-history`).set(auth('teacher'))).status).toBe(200);
    expect((await api().get(`/api/classes/${raised}/price-history`).set(auth('student'))).status).toBe(403);
    const badMonth = await api().post(`/api/classes/${raised}/price-changes`).set(auth('admin')).send({ amount: 1, effective_month: '1999-01' });
    expect(badMonth.status).toBe(400);
    const badAmount = await api().post(`/api/classes/${raised}/price-changes`).set(auth('admin')).send({ amount: -5 });
    expect(badAmount.status).toBe(400);
  });

  test('a planned price becomes the group price when its month comes', async () => {
    await pool.query(`UPDATE class_price_history SET effective_from = $2 WHERE class_id = $1 AND amount = 400000`, [quiet, monthStart(0)]);
    const { syncCurrentPrices } = require('../../../src/modules/classes/services/classPrice.service');
    await syncCurrentPrices();
    expect(Number((await pool.query('SELECT payment_amount FROM classes WHERE class_id = $1', [quiet])).rows[0].payment_amount)).toBe(400000);
  });
});
