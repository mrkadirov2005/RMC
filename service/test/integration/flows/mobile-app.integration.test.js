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

  // @MOB-040 @MOB-041 @MOB-042 @MOB-043
  test('a new absence reaches the parent phone and inbox once; muted categories stay quiet', async () => {
    const notifications = require('../../../src/modules/mobile/services/mobileNotification.service');
    await pool.query('TRUNCATE mobile_event_checkpoints, mobile_notification_outbox, mobile_notification_prefs');
    const parentLogin = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-push') })).body;
    const token = parentLogin.access_token;

    const saved = await api().put('/api/mobile/v1/devices/current/push-token').set(auth(token)).send({ push_token: 'ExponentPushToken[parent-phone]' });
    expect(saved.status).toBe(200);

    // First scan only sets the starting point: history is never pushed.
    await notifications.scanAll();
    expect((await pool.query('SELECT COUNT(*)::int AS n FROM mobile_notification_outbox')).rows[0].n).toBe(0);

    const teacherId = (await pool.query('SELECT teacher_id FROM teachers LIMIT 1')).rows[0].teacher_id;
    const classId = (await pool.query('SELECT class_id FROM students WHERE student_id = $1', [secondRecordId])).rows[0].class_id;
    await pool.query(
      `INSERT INTO attendance (center_id, student_id, class_id, teacher_id, attendance_date, status) VALUES ($1, $2, $3, $4, '2026-10-30', 'Absent')`,
      [centerId, secondRecordId, classId, teacherId],
    );
    // Coins are muted by the student; the parent never gets coin messages anyway.
    await pool.query(
      `INSERT INTO mobile_notification_prefs (user_type, user_id, category, enabled) VALUES ('student', $1, 'coins', false)`,
      [mainId],
    );
    await pool.query(`INSERT INTO student_coin_transactions (student_id, center_id, delta, reason) VALUES ($1, $2, 5, 'Faol')`, [mainId, centerId]);

    await notifications.scanAll();
    await notifications.scanAll();
    const queued = (await pool.query('SELECT user_type, category, body FROM mobile_notification_outbox ORDER BY outbox_id')).rows;
    expect(queued).toEqual([{ user_type: 'parent', category: 'attendance', body: 'Aziza darsga kelmadi (IELTS).' }]);

    const fetchFn = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ data: [{ status: 'ok' }] }) }));
    await expect(notifications.deliverDue(fetchFn)).resolves.toBe(1);
    expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual([
      expect.objectContaining({ to: 'ExponentPushToken[parent-phone]', title: 'Davomat', data: { url: `/attendance?child=${mainId}` } }),
    ]);

    const inbox = await api().get('/api/mobile/v1/notifications').set(auth(token));
    expect(inbox.body).toMatchObject({ total: 1, unread: 1 });
    await api().post('/api/mobile/v1/notifications/read').set(auth(token)).send({});
    expect((await api().get('/api/mobile/v1/notifications').set(auth(token))).body.unread).toBe(0);
  });

  // @MOB-060 @MOB-061 @MOB-062 @MOB-063 @MOB-160 @MOB-161 @MOB-162 @MOB-164
  test('admin content reaches the right users; rules need re-acceptance after a new version; requests get answers', async () => {
    const { generateToken } = require('../../../src/middleware/auth');
    const adminToken = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId });
    const admin = (method, path) => api()[method](`/api/mobile-admin${path}`).set(auth(adminToken));
    await pool.query('TRUNCATE mobile_notification_outbox, mobile_links, mobile_announcements, mobile_policies, mobile_help_requests RESTART IDENTITY CASCADE');

    const student = (await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-content') })).body.access_token;
    const parent = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-content') })).body.access_token;

    expect((await admin('post', '/links').send({ title: 'Telegram', url: 'javascript:alert(1)' })).status).toBe(400);
    expect((await admin('post', '/links').send({ title: 'Telegram', url: 'https://t.me/temurbekschool', icon: '✈️' })).status).toBe(201);
    const links = await api().get('/api/mobile/v1/links').set(auth(student));
    expect(links.body.items).toEqual([expect.objectContaining({ title: 'Telegram', url: 'https://t.me/temurbekschool' })]);

    const forParents = await admin('post', '/announcements').send({ title: 'Majlis', body: 'Ota-onalar majlisi shanba kuni', audience: 'parent', send_push: true });
    expect(forParents.status).toBe(201);
    expect(forParents.body.queued).toBe(1);
    await admin('post', '/announcements').send({ title: 'Imtihon', body: 'Mock imtihon', audience: 'student' });
    expect((await api().get('/api/mobile/v1/announcements').set(auth(parent))).body.items.map((a) => a.title)).toEqual(['Majlis']);
    expect((await api().get('/api/mobile/v1/announcements').set(auth(student))).body.items.map((a) => a.title)).toEqual(['Imtihon']);

    const policy = (await admin('post', '/policies').send({ title: "To'lov tartibi", body: "To'lov har oyning 5-sanasigacha." })).body;
    let rules = (await api().get('/api/mobile/v1/policies').set(auth(parent))).body;
    expect(rules.pending).toBe(1);
    await api().post(`/api/mobile/v1/policies/${policy.policy_id}/accept`).set(auth(parent));
    expect((await api().get('/api/mobile/v1/policies').set(auth(parent))).body.pending).toBe(0);

    await admin('post', `/policies/${policy.policy_id}/versions`).send({ body: "To'lov har oyning 10-sanasigacha." });
    rules = (await api().get('/api/mobile/v1/policies').set(auth(parent))).body;
    expect(rules.items[0]).toMatchObject({ version: 2, accepted: false, body: "To'lov har oyning 10-sanasigacha." });
    expect((await admin('get', `/policies/${policy.policy_id}/versions`)).body.items.map((v) => v.version)).toEqual([2, 1]);

    expect((await api().post('/api/mobile/v1/help-requests').set(auth(parent)).send({ kind: 'help', message: 'x' })).status).toBe(400);
    expect((await api().post('/api/mobile/v1/help-requests').set(auth(parent)).send({ kind: 'help', message: 'Savol bor', student_id: otherStudentId })).status).toBe(403);
    const request = await api().post('/api/mobile/v1/help-requests').set(auth(parent)).send({ kind: 'thanks', message: 'Rahmat ustozga!', student_id: secondRecordId });
    expect(request.status).toBe(201);

    const inbox = await admin('get', '/help-requests?status=submitted');
    expect(inbox.body.items).toEqual([expect.objectContaining({ request_id: request.body.request_id, sender_name: 'Ota Karimov', student_id: mainId })]);
    await admin('patch', `/help-requests/${request.body.request_id}`).send({ status: 'resolved', response: 'Rahmat!' });

    const mine = await api().get('/api/mobile/v1/help-requests').set(auth(parent));
    expect(mine.body.items[0]).toMatchObject({ status: 'resolved', response: 'Rahmat!' });
    const messages = (await pool.query(`SELECT category, body FROM mobile_notification_outbox WHERE user_type = 'parent' ORDER BY outbox_id`)).rows;
    expect(messages).toEqual([
      { category: 'announcements', body: 'Ota-onalar majlisi shanba kuni' },
      { category: 'help', body: 'Rahmat!' },
    ]);

    // Students and parents cannot use the admin API.
    expect((await api().get('/api/mobile-admin/links').set(auth(parent))).status).toBe(403);
  });

  // @MOB-050..MOB-056 @MOB-163 @MOB-165
  test('homework: bank, approval, assignment after a lesson, autosave, scoring, review with coins', async () => {
    const { generateToken } = require('../../../src/middleware/auth');
    const adminToken = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    const hw = (method, path) => api()[method](`/api/homework${path}`).set(auth(adminToken));
    await pool.query('TRUNCATE hw_levels, hw_assignments, hw_submissions, mobile_notification_outbox RESTART IDENTITY CASCADE');
    const b1 = (await pool.query("SELECT class_id FROM classes WHERE class_name = 'B1'")).rows[0].class_id;

    const level = (await hw('post', '/bank/level').send({ title: 'B1' })).body;
    const book = (await hw('post', '/bank/book').send({ title: 'Cambridge B1', parent_id: level.id })).body;
    const unit = (await hw('post', '/bank/unit').send({ title: 'Unit 7', parent_id: book.id })).body;
    const lesson = (await hw('post', '/bank/lesson').send({ title: 'Lesson 1', parent_id: unit.id })).body;
    expect((await hw('get', '/bank')).body.levels[0].books[0].units[0].lessons[0]).toMatchObject({ lesson_id: lesson.id, task_count: 0 });

    const content = {
      questions: [
        { id: 'q1', type: 'choice', prompt: 'reliable = ?', options: ['fast', 'can be trusted'], answer: 1 },
        { id: 'q2', type: 'gap', prompt: 'Past of go: ___', answers: ['went'] },
        { id: 'q3', type: 'text', prompt: 'Write two sentences about your weekend', points: 3 },
      ],
    };
    expect((await hw('post', '/tasks').send({ lesson_id: lesson.id, title: 'Bad', skill: 'grammar', content: { questions: [] } })).status).toBe(400);
    const task = (await hw('post', '/tasks').send({ lesson_id: lesson.id, title: 'Unit 7 vocabulary', skill: 'vocabulary', content })).body;
    expect(Number(task.max_score)).toBe(5);
    expect((await hw('post', '/assignments').send({ task_id: task.task_id, class_id: b1 })).body.code).toBe('NOT_APPROVED');
    await hw('post', `/tasks/${task.task_id}/approve`);

    const now = (await hw('post', '/assignments').send({ task_id: task.task_id, class_id: b1, due_at: '2026-12-01T18:00:00' })).body;
    const later = (await hw('post', '/assignments').send({ task_id: task.task_id, class_id: b1, open_after_lesson: true })).body;

    const student = (await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-hw') })).body.access_token;
    let list = (await api().get('/api/mobile/v1/student/homework').set(auth(student))).body;
    expect(list.items.map((i) => i.assignment_id)).toEqual([now.assignment_id]);

    // The second one opens once the group's next lesson after assigning has ended.
    await pool.query("UPDATE hw_assignments SET created_at = LOCALTIMESTAMP - INTERVAL '2 days' WHERE assignment_id = $1", [later.assignment_id]);
    await pool.query(
      `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time, status)
       VALUES ($1, $2, 1, CURRENT_DATE - 1, '10:00', 90, '11:30', 'completed')`,
      [centerId, b1],
    );
    list = (await api().get('/api/mobile/v1/student/homework').set(auth(student))).body;
    expect(list.items.map((i) => i.assignment_id).sort()).toEqual([now.assignment_id, later.assignment_id].sort());
    expect(list.pending).toBe(2);

    const detail = (await api().get(`/api/mobile/v1/student/homework/${now.assignment_id}`).set(auth(student))).body;
    expect(detail.task.questions[0]).toEqual({ id: 'q1', type: 'choice', prompt: 'reliable = ?', points: 1, options: ['fast', 'can be trusted'] });
    expect(JSON.stringify(detail.task)).not.toContain('went');

    await api().put(`/api/mobile/v1/student/homework/${now.assignment_id}/answers`).set(auth(student)).send({ answers: { q1: 1 } });
    expect((await api().get(`/api/mobile/v1/student/homework/${now.assignment_id}`).set(auth(student))).body).toMatchObject({ status: 'in_progress', answers: { q1: 1 } });

    const submitted = await api().post(`/api/mobile/v1/student/homework/${now.assignment_id}/submit`).set(auth(student))
      .send({ answers: { q1: 1, q2: ' Went ', q3: 'I played football. I read a book.' } });
    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ status: 'submitted', per_question: { q1: 1, q2: 1, q3: null } });
    expect(Number(submitted.body.auto_score)).toBe(2);
    expect((await api().post(`/api/mobile/v1/student/homework/${now.assignment_id}/submit`).set(auth(student)).send({})).status).toBe(409);

    const subs = (await hw('get', `/assignments/${now.assignment_id}/submissions`)).body.items;
    expect(subs).toEqual([expect.objectContaining({ student_id: mainId, status: 'submitted', first_name: 'Aziza' })]);
    expect((await hw('post', `/submissions/${subs[0].submission_id}/review`).send({ score: 9 })).body.code).toBe('INVALID_SCORE');
    const coinsBefore = (await pool.query('SELECT coins FROM students WHERE student_id = $1', [mainId])).rows[0].coins;
    const reviewed = await hw('post', `/submissions/${subs[0].submission_id}/review`).send({ score: 4, feedback: 'Yaxshi!' });
    expect(reviewed.body).toMatchObject({ status: 'reviewed', coins_awarded: 4, feedback: 'Yaxshi!' });
    // Re-grading adjusts the same coin row instead of paying twice.
    await hw('post', `/submissions/${subs[0].submission_id}/review`).send({ score: 5 });
    expect((await pool.query('SELECT coins FROM students WHERE student_id = $1', [mainId])).rows[0].coins).toBe(coinsBefore + 5);

    const parent = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-hw') })).body.access_token;
    const childList = (await api().get(`/api/mobile/v1/parent/children/${mainId}/homework`).set(auth(parent))).body;
    expect(childList.items.find((i) => i.assignment_id === now.assignment_id)).toMatchObject({ status: 'reviewed', score: 5 });
    const pushes = (await pool.query("SELECT user_type FROM mobile_notification_outbox WHERE category = 'homework' ORDER BY outbox_id")).rows.map((r) => r.user_type);
    expect(pushes).toEqual(['student', 'parent', 'student', 'parent']);

    // Students and parents cannot reach the teacher API.
    expect((await api().get('/api/homework/bank').set(auth(student))).status).toBe(403);
  });
});
