const request = require('supertest');

// Subject -> level -> group: groups take their level's price; a level's price change counts from
// its month for every group in it, and months before a group joined a level keep its own price.
describe('subject levels with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  let teacherId;
  let subjectId; // "English" given to group A (a subject row tied to a group)
  let groupA; // 300 000 own price, paid 300 000 for three months before joining a level
  let groupB; // 340 000 own price
  let starter;
  const students = {};
  const tokens = {};

  const api = () => request(server);
  const auth = (who) => ({ Authorization: `Bearer ${tokens[who]}` });

  const monthStart = (offset) => {
    const now = new Date(Date.now() + 5 * 3600 * 1000);
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1)).toISOString().slice(0, 10);
  };
  const lastDay = (offset) => {
    const start = new Date(`${monthStart(offset + 1)}T00:00:00Z`);
    start.setUTCDate(0);
    return start.toISOString().slice(0, 10);
  };
  const ym = (offset) => monthStart(offset).slice(0, 7);
  const day = (offset, d = 5) => `${monthStart(offset).slice(0, 8)}${String(d).padStart(2, '0')}`;
  const pay = (studentId, date, amount) => pool.query(
    `INSERT INTO payments (student_id, center_id, payment_date, amount, original_amount, currency, payment_method, payment_status, payment_type, receipt_number)
     VALUES ($1, $2, $3, $4, $4, 'UZS', 'Cash', 'Completed', 'Tuition', $5)`,
    [studentId, centerId, date, amount, `L-${studentId}-${date}-${amount}-${Math.random()}`],
  );
  const summary = async (classId, from, to) => {
    const res = await api().get('/api/payments/students-summary').query({ from, to, class_id: classId }).set(auth('admin'));
    expect(res.status).toBe(200);
    return Object.fromEntries((res.body.rows || res.body.items || []).map((row) => [row.student_id, row]));
  };
  const classPrice = async (classId) =>
    Number((await pool.query('SELECT payment_amount FROM classes WHERE class_id = $1', [classId])).rows[0].payment_amount);

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query(`TRUNCATE TABLE edu_centers, class_price_history, level_price_history, class_level_history,
      subject_levels, subjects, payments RESTART IDENTITY CASCADE`);
    await require('../../../src/modules/developer/seal').reseal();
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Level Center', 'LVL-C') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'LV-T', 'Islom', 'Tursunov') RETURNING teacher_id`, [centerId],
    )).rows[0].teacher_id;
    const makeClass = async (name, price) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, $2, $3, $4, $5) RETURNING class_id`,
      [centerId, name, `LV-${name}`, teacherId, price],
    )).rows[0].class_id;
    groupA = await makeClass('Starter A', 300000);
    groupB = await makeClass('Starter B', 340000);
    subjectId = (await pool.query(
      `INSERT INTO subjects (center_id, class_id, subject_name, subject_code, teacher_id) VALUES ($1, $2, 'English', 'ENG', $3) RETURNING subject_id`,
      [centerId, groupA, teacherId],
    )).rows[0].subject_id;
    const student = async (key, classId) => {
      students[key] = (await pool.query(
        `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status, start_date)
         VALUES ($1, $2, $2, 'Test', $3, $4, 'Active', $5) RETURNING student_id`,
        [centerId, key, classId, teacherId, monthStart(-6)],
      )).rows[0].student_id;
    };
    await student('ali', groupA);
    await student('bek', groupB);
    for (const offset of [-3, -2, -1]) {
      await pay(students.ali, day(offset), 300000);
      await pay(students.bek, day(offset), 340000);
    }

    const { createApp } = require('../../../src/index');
    const expressApp = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = expressApp.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const { generateToken } = require('../../../src/middleware/auth');
    tokens.admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1', permissions: ['CRUD_SUBJECT'] });
    tokens.plainAdmin = generateToken({ id: 3, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin2', permissions: [] });
    tokens.developer = generateToken({ id: 2, userType: 'superuser', role: 'owner', center_id: centerId, username: 'dev', is_developer: true });
    tokens.teacher = generateToken({ id: teacherId, userType: 'teacher', center_id: centerId, username: 'islom' });
  });

  afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    const { db } = pool;
    if (db?.$client?.end) await db.$client.end().catch(() => {});
    else await pool.end?.().catch(() => {});
  });

  test('admins add levels; only the developer gives them a price', async () => {
    expect((await api().post(`/api/subjects/${subjectId}/levels`).set(auth('plainAdmin')).send({ level_name: 'Starter' })).status).toBe(403);
    expect((await api().post(`/api/subjects/${subjectId}/levels`).set(auth('admin')).send({ level_name: 'Starter', payment_amount: 320000 })).status).toBe(403);

    const created = await api().post(`/api/subjects/${subjectId}/levels`).set(auth('admin')).send({ level_name: 'Starter' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ level_name: 'Starter', payment_amount: null });
    starter = created.body.level_id;
    // The level hangs off the subject's own row (no group), created on demand.
    const owner = (await pool.query('SELECT s.class_id FROM subject_levels l JOIN subjects s ON s.subject_id = l.subject_id WHERE l.level_id = $1', [starter])).rows[0];
    expect(owner.class_id).toBeNull();
    expect((await api().post(`/api/subjects/${subjectId}/levels`).set(auth('admin')).send({ level_name: ' starter ' })).status).toBe(409);

    expect((await api().post(`/api/levels/${starter}/price-changes`).set(auth('admin')).send({ amount: 300000 })).status).toBe(403);
    const priced = await api().post(`/api/levels/${starter}/price-changes`).set(auth('developer')).send({ amount: 300000 });
    expect(priced.status).toBe(201);
    expect(priced.body.entry).toMatchObject({ amount: 300000, source: 'initial', effective_from: '2000-01' });
  });

  test('groups join the level and take its price; earlier months keep their own price', async () => {
    expect((await api().put(`/api/classes/${groupA}/level`).set(auth('plainAdmin')).send({ level_id: starter })).status).toBe(403);
    const joinA = await api().put(`/api/classes/${groupA}/level`).set(auth('admin')).send({ level_id: starter });
    expect(joinA.status).toBe(200);
    expect(joinA.body).toMatchObject({ level_id: starter, current_amount: 300000, effective_from: ym(0) });
    const joinB = await api().put(`/api/classes/${groupB}/level`).set(auth('admin')).send({ level_id: starter });
    expect(joinB.body.current_amount).toBe(300000);
    expect(await classPrice(groupB)).toBe(300000);
    expect((await api().put(`/api/classes/${groupA}/level`).set(auth('admin')).send({ level_id: starter })).status).toBe(409);

    // Group B paid 340 000 a month before joining: those months stay paid at 340 000.
    const old = await summary(groupB, monthStart(-3), lastDay(-1));
    expect(old[students.bek].state).toBe('paid');
    expect(Number(old[students.bek].expected)).toBe(1020000);

    const listed = await api().get(`/api/subjects/${subjectId}/levels`).set(auth('teacher'));
    expect(listed.status).toBe(200);
    expect(listed.body.levels).toHaveLength(1);
    expect(listed.body.levels[0].groups.map((g) => g.class_name)).toEqual(['Starter A', 'Starter B']);
    expect(listed.body.levels[0].groups[0]).toMatchObject({ since: ym(0), payment_amount: 300000 });
    expect(listed.body.unleveled_groups).toEqual([]);

    const classes = await api().get('/api/classes').set(auth('admin'));
    const a = (classes.body.data || classes.body).find((row) => row.class_id === groupA);
    expect(a).toMatchObject({ level_id: starter, level_name: 'Starter' });
  });

  test('a level price change counts from its month for every group in the level', async () => {
    const change = await api().post(`/api/levels/${starter}/price-changes`).set(auth('developer'))
      .send({ amount: 320000, effective_month: ym(0), note: 'Raise' });
    expect(change.status).toBe(201);
    expect(change.body).toMatchObject({ current_amount: 320000, groups_updated: 2 });
    expect(change.body.entry).toMatchObject({ amount: 320000, previous_amount: 300000, source: 'manual' });
    expect(await classPrice(groupA)).toBe(320000);
    expect(await classPrice(groupB)).toBe(320000);

    const now = await summary(groupA, monthStart(0), lastDay(0));
    expect(Number(now[students.ali].expected)).toBe(320000);
    const before = await summary(groupA, monthStart(-3), lastDay(-1));
    expect(before[students.ali].state).toBe('paid');

    // The group's own price can't be changed while it is in a level.
    expect((await api().post(`/api/classes/${groupA}/price-changes`).set(auth('developer')).send({ amount: 500000 })).status).toBe(409);

    const history = (await api().get(`/api/classes/${groupA}/price-history`).set(auth('admin'))).body;
    expect(history.level).toMatchObject({ level_name: 'Starter', current_amount: 320000 });
    expect(history.level.items.map((h) => h.amount)).toEqual([320000, 300000]);
    expect(history.level_moves[0]).toMatchObject({ level_name: 'Starter', effective_from: ym(0) });
  });

  test("the web panel's price timeline combines own prices and level prices", async () => {
    const res = await api().get('/api/classes/price-histories').set(auth('admin'));
    expect(res.status).toBe(200);
    const timeline = res.body.classes[groupB];
    expect(timeline).toEqual([
      { amount: 320000, effective_from: ym(0) },
      { amount: 340000, effective_from: '2000-01' },
    ]);
  });

  test("a level with groups can't be deleted, nor a subject with levels", async () => {
    expect((await api().delete(`/api/levels/${starter}`).set(auth('admin'))).status).toBe(409);
    const owner = (await pool.query('SELECT subject_id FROM subject_levels WHERE level_id = $1', [starter])).rows[0].subject_id;
    expect((await api().delete(`/api/subjects/${owner}`).set(auth('admin'))).status).toBe(409);
  });

  test('a group leaving its level goes back to its own price from that month', async () => {
    const leave = await api().put(`/api/classes/${groupB}/level`).set(auth('admin')).send({ level_id: null });
    expect(leave.status).toBe(200);
    expect(leave.body.current_amount).toBe(340000);
    const empty = await api().post(`/api/subjects/${subjectId}/levels`).set(auth('admin')).send({ level_name: 'Movers' });
    expect((await api().delete(`/api/levels/${empty.body.level_id}`).set(auth('admin'))).status).toBe(200);
  });
});
