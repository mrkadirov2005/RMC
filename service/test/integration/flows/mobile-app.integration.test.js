const bcrypt = require('bcryptjs');
const request = require('supertest');

// @MOB-013 @MOB-022 @MOB-023 @MOB-026..MOB-031 The mobile API end to end on PostgreSQL:
// sign-in, data for a student in two groups and for their parent, isolation between families,
// and refresh-token rotation with reuse detection.
describe('mobile app API with PostgreSQL', () => {
  let pool;
  let server;
  let centerId;
  let mainId;
  let secondRecordId;
  let otherStudentId;

  const api = () => request(server);
  const device = (id) => ({ device_id: id, device_name: 'Test phone', platform: 'android', app_version: '1.0.0' });
  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners, parents, mobile_sessions RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Mobile Center', 'MOB-C') RETURNING center_id`)).rows[0].center_id;
    const teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'MOB-T', 'Temur', 'Aliyev') RETURNING teacher_id`, [centerId],
    )).rows[0].teacher_id;
    const makeClass = async (name) => (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id, payment_amount) VALUES ($1, $2, $3, $4, 480000) RETURNING class_id`,
      [centerId, name, `MOB-${name}`, teacherId],
    )).rows[0].class_id;
    const b1 = await makeClass('B1');
    const ielts = await makeClass('IELTS');
    const hash = bcrypt.hashSync('secret-pass', 10);
    const insertStudent = async (enrollment, classId, username, coins) => (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, class_id, teacher_id, status, coins)
       VALUES ($1, $2, 'Aziza', 'Karimova', $3, $4, $5, $6, 'Active', $7) RETURNING student_id`,
      [centerId, enrollment, username, username ? hash : null, classId, teacherId, coins],
    )).rows[0].student_id;

    mainId = await insertStudent('MOB-1', b1, 'aziza', 120);
    const studentRepository = require('../../../src/modules/students/repositories/student.repository');
    secondRecordId = (await studentRepository.assignToGroup(mainId, ielts, centerId)).student.student_id;
    otherStudentId = await insertStudent('MOB-2', b1, 'bobur', 300);

    await pool.query(`INSERT INTO rooms (center_id, room_number, class_id, day, time, end_time) VALUES ($1, 'R3', $2, 'Monday', '14:00', '15:30')`, [centerId, b1]);
    await pool.query(
      `INSERT INTO attendance (center_id, student_id, class_id, teacher_id, attendance_date, status) VALUES
       ($1, $2, $3, $6, '2026-10-01', 'Present'), ($1, $2, $3, $6, '2026-10-03', 'Absent'), ($1, $4, $5, $6, '2026-10-02', 'Late')`,
      [centerId, mainId, b1, secondRecordId, ielts, teacherId],
    );
    await pool.query(
      `INSERT INTO debts (center_id, student_id, debt_amount, debt_date, amount_paid, balance, due_date, status) VALUES ($1, $2, 480000, '2026-10-05', 0, 480000, '2026-11-05', 'Pending')`,
      [centerId, secondRecordId],
    );

    const parentId = (await pool.query(
      `INSERT INTO parents (first_name, last_name, username, password_hash, center_id) VALUES ('Ota', 'Karimov', 'karimov', $1, $2) RETURNING parent_id`,
      [hash, centerId],
    )).rows[0].parent_id;
    await pool.query('INSERT INTO parent_students (parent_id, student_id, center_id) VALUES ($1, $2, $3)', [parentId, mainId, centerId]);

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

  test('app-config is public', async () => {
    const res = await api().get('/api/mobile/v1/app-config');
    expect(res.status).toBe(200);
    expect(res.body.api_version).toBe('v1');
  });

  test('wrong password is refused without a session', async () => {
    const res = await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'nope', ...device('d0') });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('a student in two groups sees both groups, combined attendance and coins', async () => {
    const login = await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-1') });
    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ role: 'student', id: mainId });
    const token = login.body.access_token;

    const dash = await api().get('/api/mobile/v1/student/dashboard').set(auth(token));
    expect(dash.status).toBe(200);
    expect(dash.body.student.groups.map((g) => g.class_name).sort()).toEqual(['B1', 'IELTS']);
    expect(dash.body.attendance).toMatchObject({ total: 3, present: 2, absent: 1, rate: 67 });
    expect(dash.body.schedule).toEqual([expect.objectContaining({ day: 'Monday', class_name: 'B1', room: 'R3' })]);
    expect(dash.body.payments).toEqual({ outstanding: 480000, next_due_date: '2026-11-05' });

    const coins = await api().get('/api/mobile/v1/student/coins').set(auth(token));
    expect(coins.body.balance).toBe(120);

    const board = await api().get('/api/mobile/v1/student/leaderboard?scope=center').set(auth(token));
    expect(board.status).toBe(200);
    expect(board.body.items[0]).toEqual({ rank: 1, name: 'Aziza K.', coins: 300, is_me: false });
    expect(board.body.me).toMatchObject({ is_me: true, coins: 120 });

    const parentOnly = await api().get('/api/mobile/v1/parent/children').set(auth(token));
    expect(parentOnly.status).toBe(403);
  });

  test('a parent sees only their own child, through any of the child records', async () => {
    const login = await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-1') });
    expect(login.status).toBe(200);
    const token = login.body.access_token;

    const children = await api().get('/api/mobile/v1/parent/children').set(auth(token));
    expect(children.body.items).toHaveLength(1);
    expect(children.body.items[0]).toMatchObject({ student_id: mainId });
    expect(children.body.items[0].linked_ids).toBeUndefined();

    const payments = await api().get(`/api/mobile/v1/parent/children/${secondRecordId}/payments`).set(auth(token));
    expect(payments.status).toBe(200);
    expect(payments.body.outstanding).toBe(480000);

    const attendance = await api().get(`/api/mobile/v1/parent/children/${mainId}/attendance?page_size=2`).set(auth(token));
    expect(attendance.body).toMatchObject({ total: 3, page_size: 2 });
    expect(attendance.body.items).toHaveLength(2);

    const stranger = await api().get(`/api/mobile/v1/parent/children/${otherStudentId}/dashboard`).set(auth(token));
    expect(stranger.status).toBe(403);
    expect(stranger.body.code).toBe('CHILD_NOT_LINKED');

    const studentOnly = await api().get('/api/mobile/v1/student/dashboard').set(auth(token));
    expect(studentOnly.status).toBe(403);
  });

  test('refresh rotates, a reused token kills the session, and the access token stops working', async () => {
    const login = await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-2') });
    const first = login.body;

    const rotated = await api().post('/api/mobile/v1/auth/refresh').send({ refresh_token: first.refresh_token });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refresh_token).not.toBe(first.refresh_token);

    const devices = await api().get('/api/mobile/v1/devices').set(auth(rotated.body.access_token));
    expect(devices.body.items.find((d) => d.is_current)).toMatchObject({ session_id: first.session_id });

    const reused = await api().post('/api/mobile/v1/auth/refresh').send({ refresh_token: first.refresh_token });
    expect(reused.status).toBe(401);
    expect(reused.body.code).toBe('REFRESH_TOKEN_REUSED');

    const afterReuse = await api().post('/api/mobile/v1/auth/refresh').send({ refresh_token: rotated.body.refresh_token });
    expect(afterReuse.status).toBe(401);

    const me = await api().get('/api/mobile/v1/me').set(auth(rotated.body.access_token));
    expect(me.status).toBe(401);
    expect(me.body.code).toBe('SESSION_REVOKED');
  });

  test('signing out one device leaves the other signed in', async () => {
    const a = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-a') })).body;
    const b = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-b') })).body;

    const out = await api().post('/api/mobile/v1/auth/logout').send({ refresh_token: a.refresh_token });
    expect(out.status).toBe(200);

    expect((await api().get('/api/mobile/v1/me').set(auth(a.access_token))).status).toBe(401);
    const stillIn = await api().get('/api/mobile/v1/me').set(auth(b.access_token));
    expect(stillIn.status).toBe(200);
    expect(stillIn.body).toMatchObject({ role: 'parent', first_name: 'Ota' });
  });
});
