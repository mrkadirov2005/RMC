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
    await pool.query('TRUNCATE TABLE edu_centers, owners, parents, mobile_sessions, mobile_password_resets, parent_link_requests, mobile_onboarding, mobile_consents, media_files, flashcard_reviews RESTART IDENTITY CASCADE');
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
  // @MOB-024 @MOB-032 @MOB-125 @MOB-166
  test('password reset by code, student ID QR, parent link request from the app, adoption numbers', async () => {
    const { generateToken } = require('../../../src/middleware/auth');
    const adminToken = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId });
    await pool.query("UPDATE students SET phone = '+998901234567' WHERE student_id = $1", [mainId]);

    // No SMS gateway in tests: the code goes to the log.
    const savedUser = process.env.SMS_GATEWAY_USERNAME;
    process.env.SMS_GATEWAY_USERNAME = '';
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const asked = await api().post('/api/mobile/v1/auth/password-reset/request').send({ username: 'aziza' });
      expect(asked.status).toBe(200);
      expect(asked.body.phone_hint).toBe('+998 ** *** ** 67');
      const code = String(log.mock.calls.map((c) => c.join(' ')).find((l) => l.includes('password reset code'))).match(/(\d{6})$/)[1];
      const stored = await pool.query('SELECT code_hash FROM mobile_password_resets WHERE user_id = $1', [mainId]);
      expect(stored.rows[0].code_hash).not.toContain(code);

      const signedIn = (await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-reset') })).body.access_token;
      const wrong = code === '000000' ? '111111' : '000000';
      expect((await api().post('/api/mobile/v1/auth/password-reset/confirm').send({ username: 'aziza', code: wrong, new_password: 'brand-new' })).body.code).toBe('CODE_INVALID');
      expect((await api().post('/api/mobile/v1/auth/password-reset/confirm').send({ username: 'aziza', code, new_password: 'brand-new' })).status).toBe(200);
      // Single use, and every device was signed out.
      expect((await api().post('/api/mobile/v1/auth/password-reset/confirm').send({ username: 'aziza', code, new_password: 'other-one' })).status).toBe(400);
      expect((await api().get('/api/mobile/v1/me').set(auth(signedIn))).status).toBe(401);
      expect((await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'brand-new', ...device('stu-reset') })).status).toBe(200);
    } finally {
      log.mockRestore();
      process.env.SMS_GATEWAY_USERNAME = savedUser;
      await pool.query('UPDATE students SET password_hash = $1 WHERE student_id = $2', [bcrypt.hashSync('secret-pass', 10), mainId]);
    }

    // Student ID: a fresh token verifies for staff; an edited one does not.
    const student = (await api().post('/api/mobile/v1/auth/login').send({ username: 'aziza', password: 'secret-pass', ...device('stu-id') })).body.access_token;
    const { token } = (await api().get('/api/mobile/v1/student/id-token').set(auth(student))).body;
    const verify = (value) => api().get('/api/mobile-staff/student-id/verify').query({ token: value }).set(auth(adminToken));
    const ok = await verify(token);
    expect(ok.body).toMatchObject({ valid: true, student: { student_id: mainId, groups: ['B1', 'IELTS'] } });
    expect((await verify(token.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')))).body).toEqual({ valid: false, reason: 'bad_signature' });
    expect((await api().get('/api/mobile-staff/student-id/verify').query({ token }).set(auth(student))).status).toBe(403);

    // A parent asks for Bobur; a duplicate is refused; approval links him and tells the parent in the app.
    const parent = (await api().post('/api/mobile/v1/auth/login').send({ username: 'karimov', password: 'secret-pass', ...device('par-link') })).body.access_token;
    expect((await api().post('/api/mobile/v1/parent/link-requests').set(auth(parent)).send({ child_query: 'bobur' })).status).toBe(201);
    expect((await api().post('/api/mobile/v1/parent/link-requests').set(auth(parent)).send({ child_query: 'bobur' })).status).toBe(409);
    expect((await api().post('/api/mobile/v1/parent/link-requests').set(auth(parent)).send({ child_query: 'aziza' })).body.code).toBe('ALREADY_LINKED');
    const pending = await api().get('/api/parent-link-requests').query({ status: 'Pending' }).set(auth(adminToken));
    const request = pending.body.find((r) => r.source === 'app');
    expect(request).toMatchObject({ student_id: otherStudentId, child_query: 'bobur', telegram_chat_id: null });
    expect((await api().get('/api/mobile-admin/adoption').set(auth(adminToken))).body.link_requests_pending).toBe(1);
    expect((await api().post(`/api/parent-link-requests/${request.request_id}/approve`).set(auth(adminToken))).status).toBe(200);
    const children = await api().get('/api/mobile/v1/parent/children').set(auth(parent));
    expect(children.body.items.map((c) => c.student_id).sort()).toEqual([mainId, otherStudentId].sort());
    const inbox = await api().get('/api/mobile/v1/notifications').set(auth(parent));
    expect(inbox.body.items[0]).toMatchObject({ title: 'So‘rov tasdiqlandi', body: expect.stringContaining('Aziza') });
    const mine = await api().get('/api/mobile/v1/parent/link-requests').set(auth(parent));
    expect(mine.body.items[0]).toMatchObject({ status: 'Approved' });

    const stats = (await api().get('/api/mobile-admin/adoption').set(auth(adminToken))).body;
    expect(stats).toMatchObject({ parents_total: 1, parents_signed_in: 1, link_requests_pending: 0 });
    expect(stats.students_signed_in).toBeGreaterThanOrEqual(1);
  });
  // @MOB-112 @MOB-113
  test('onboarding is optional; a parent answers consent for a minor, the student cannot', async () => {
    const savedToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = '';
    try {
      await pool.query("UPDATE students SET date_of_birth = '2013-04-12' WHERE student_id = $1", [mainId]);
      // Signed in through the service, not the HTTP route, to stay under its per-minute limit.
      const mobileAuth = require('../../../src/modules/mobile/services/mobileAuth.service');
      const student = (await mobileAuth.login({ username: 'aziza', password: 'secret-pass', ...device('stu-onb') })).access_token;
      const parent = (await mobileAuth.login({ username: 'karimov', password: 'secret-pass', ...device('par-onb') })).access_token;

      const first = await api().get('/api/mobile/v1/onboarding').set(auth(student));
      expect(first.body).toMatchObject({ show: true, telegram: { status: 'not_configured' } });
      expect(first.body.consents).toEqual([expect.objectContaining({ student_id: mainId, minor: true, can_answer: false, granted: null })]);
      expect((await api().put('/api/mobile/v1/consents').set(auth(student)).send({ student_id: mainId, kind: 'video', granted: true })).status).toBe(403);
      // Skipping never blocks anything: the student's data still loads, and onboarding stops showing.
      expect((await api().post('/api/mobile/v1/onboarding/finish').set(auth(student)).send({ skipped: true })).status).toBe(200);
      expect((await api().get('/api/mobile/v1/onboarding').set(auth(student))).body).toMatchObject({ show: false, skipped: true });
      expect((await api().get('/api/mobile/v1/student/dashboard').set(auth(student))).status).toBe(200);

      expect((await api().put('/api/mobile/v1/consents').set(auth(parent)).send({ student_id: mainId, kind: 'video', granted: true })).status).toBe(200);
      expect((await api().put('/api/mobile/v1/consents').set(auth(parent)).send({ student_id: mainId, kind: 'video', granted: false })).status).toBe(200);
      // A child that is not theirs.
      expect((await api().put('/api/mobile/v1/consents').set(auth(parent)).send({ student_id: 999999, kind: 'video', granted: true })).status).toBe(404);
      const parentView = await api().get('/api/mobile/v1/onboarding').set(auth(parent));
      expect(parentView.body.consents.find((c) => c.student_id === mainId)).toMatchObject({ granted: false, can_answer: true });
      const history = await pool.query('SELECT granted FROM mobile_consents WHERE student_id = $1 ORDER BY consent_id', [mainId]);
      expect(history.rows.map((r) => r.granted)).toEqual([true, false]);
      await api().post('/api/mobile/v1/onboarding/instagram-opened').set(auth(parent));
      await api().post('/api/mobile/v1/onboarding/finish').set(auth(parent)).send({});
      const done = await pool.query("SELECT completed_at, skipped, instagram_opened_at FROM mobile_onboarding WHERE user_type = 'parent'");
      expect(done.rows[0]).toMatchObject({ skipped: false, completed_at: expect.any(Date), instagram_opened_at: expect.any(Date) });
    } finally {
      process.env.TELEGRAM_BOT_TOKEN = savedToken;
    }
  });
  // @MOB-055 @MOB-143
  test('spoken and photo answers: signed upload, size check, submit, teacher opens the file', async () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const savedDir = process.env.MEDIA_LOCAL_DIR;
    process.env.MEDIA_LOCAL_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rmc-media-'));
    try {
      const { generateToken } = require('../../../src/middleware/auth');
      const adminToken = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
      const hw = (method, p) => api()[method](`/api/homework${p}`).set(auth(adminToken));
      const b1 = (await pool.query("SELECT class_id FROM classes WHERE class_name = 'B1'")).rows[0].class_id;
      const level = (await hw('post', '/bank/level').send({ title: 'Speaking' })).body;
      const book = (await hw('post', '/bank/book').send({ title: 'Book', parent_id: level.id })).body;
      const unit = (await hw('post', '/bank/unit').send({ title: 'Unit', parent_id: book.id })).body;
      const lesson = (await hw('post', '/bank/lesson').send({ title: 'Lesson', parent_id: unit.id })).body;
      const content = {
        questions: [
          { id: 'say', type: 'audio', prompt: 'Read the text aloud', max_seconds: 60, points: 5 },
          { id: 'photo', type: 'file', prompt: 'Photo of your notebook', max_files: 1, points: 2 },
        ],
      };
      const task = (await hw('post', '/tasks').send({ lesson_id: lesson.id, title: 'Speaking 1', skill: 'speaking', content })).body;
      await hw('post', `/tasks/${task.task_id}/approve`);
      const assignment = (await hw('post', '/assignments').send({ task_id: task.task_id, class_id: b1 })).body;

      const mobileAuth = require('../../../src/modules/mobile/services/mobileAuth.service');
      const student = (await mobileAuth.login({ username: 'aziza', password: 'secret-pass', ...device('stu-media') })).access_token;
      const detail = (await api().get(`/api/mobile/v1/student/homework/${assignment.assignment_id}`).set(auth(student))).body;
      expect(detail.task.questions).toEqual([
        { id: 'say', type: 'audio', prompt: 'Read the text aloud', points: 5, max_seconds: 60 },
        { id: 'photo', type: 'file', prompt: 'Photo of your notebook', points: 2, max_files: 1 },
      ]);

      // Over the limit or of a type not allowed: refused before any upload.
      const start = (body) => api().post('/api/mobile/v1/media/uploads').set(auth(student)).send({ purpose: 'homework', ...body });
      expect((await start({ content_type: 'audio/mp4', size_bytes: 30 * 1024 * 1024 })).status).toBe(413);
      expect((await start({ content_type: 'application/x-msdownload', size_bytes: 100 })).status).toBe(415);

      const upload = async (contentType, bytes, announced = bytes.length) => {
        const started = (await start({ content_type: contentType, size_bytes: announced, file_name: 'answer' })).body;
        const url = new URL(started.upload.url);
        const put = await api().put(url.pathname + url.search).set('Content-Type', contentType).send(bytes);
        return { id: started.media.media_id, put: put.status };
      };
      const audio = await upload('audio/mp4', Buffer.alloc(3000, 1));
      expect(audio.put).toBe(200);
      // More bytes than were signed for: refused by the storage URL.
      const cheat = await upload('image/jpeg', Buffer.alloc(500, 2), 100);
      expect(cheat.put).toBe(413);
      const photo = await upload('image/jpeg', Buffer.alloc(800, 3));

      // Not confirmed yet: submitting with it is refused.
      expect((await api().post(`/api/mobile/v1/student/homework/${assignment.assignment_id}/submit`).set(auth(student)).send({ answers: { say: audio.id } })).body.code).toBe('BAD_MEDIA');
      for (const id of [audio.id, photo.id]) {
        expect((await api().post(`/api/mobile/v1/media/${id}/complete`).set(auth(student))).body).toMatchObject({ status: 'uploaded' });
      }
      expect((await api().post(`/api/mobile/v1/media/${cheat.id}/complete`).set(auth(student))).body.code).toBe('NOT_UPLOADED');

      // Another student's file cannot be used or opened.
      const bobur = (await mobileAuth.login({ username: 'bobur', password: 'secret-pass', ...device('bob-media') })).access_token;
      expect((await api().get(`/api/mobile/v1/media/${audio.id}`).set(auth(bobur))).status).toBe(404);

      const submitted = await api().post(`/api/mobile/v1/student/homework/${assignment.assignment_id}/submit`).set(auth(student)).send({ answers: { say: audio.id, photo: [photo.id] } });
      expect(submitted.status).toBe(200);
      expect(submitted.body).toMatchObject({ status: 'submitted', per_question: { say: null, photo: null } });

      // The teacher's view lists the files and opens them by a signed link.
      const subs = (await hw('get', `/assignments/${assignment.assignment_id}/submissions`)).body.items;
      expect(subs[0].media.map((m) => m.media_id).sort()).toEqual([audio.id, photo.id].sort());
      const link = (await hw('get', `/media/${audio.id}`)).body;
      expect(link).toMatchObject({ kind: 'audio', content_type: 'audio/mp4', size_bytes: 3000 });
      const url = new URL(link.url);
      const file = await api().get(url.pathname + url.search).buffer(true).parse((res, cb) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => cb(null, Buffer.concat(chunks)));
      });
      expect(file.status).toBe(200);
      expect(file.headers['content-type']).toBe('audio/mp4');
      expect(file.body.length).toBe(3000);
      // A tampered link is refused.
      expect((await api().get(url.pathname + url.search.replace('op=get', 'op=put'))).status).toBe(403);

      expect((await hw('post', `/submissions/${submitted.body.submission_id}/review`).send({ score: 6, feedback: 'Good pronunciation' })).status).toBe(200);
    } finally {
      fs.rmSync(process.env.MEDIA_LOCAL_DIR, { recursive: true, force: true });
      process.env.MEDIA_LOCAL_DIR = savedDir;
    }
  });
  // @MOB-145
  test('flashcards: words of the student\'s groups, hard and easy answers set different review dates', async () => {
    const b1 = (await pool.query("SELECT class_id, teacher_id FROM classes WHERE class_name = 'B1'")).rows[0];
    const sessionId = (await pool.query(
      `INSERT INTO sessions (center_id, class_id, teacher_id, session_date, start_time, duration_minutes, end_time, status)
       VALUES ($1, $2, $3, CURRENT_DATE, '09:00', 90, '10:30', 'completed') RETURNING session_id`,
      [centerId, b1.class_id, b1.teacher_id],
    )).rows[0].session_id;
    const setId = (await pool.query(
      `INSERT INTO consolidation_sets (center_id, class_id, session_id, teacher_id, title, share_token)
       VALUES ($1, $2, $3, $4, 'Unit 7', 'flash-test') RETURNING consolidation_set_id`,
      [centerId, b1.class_id, sessionId, b1.teacher_id],
    )).rows[0].consolidation_set_id;
    await pool.query(
      `INSERT INTO consolidation_words (consolidation_set_id, word_order, main_word, translations) VALUES
       ($1, 1, 'reliable', '["ishonchli"]'), ($1, 2, 'brave', '["jasur", "botir"]')`,
      [setId],
    );

    const mobileAuth = require('../../../src/modules/mobile/services/mobileAuth.service');
    const student = (await mobileAuth.login({ username: 'aziza', password: 'secret-pass', ...device('stu-cards') })).access_token;
    const first = (await api().get('/api/mobile/v1/student/flashcards').set(auth(student))).body;
    expect(first.stats).toMatchObject({ total: 2, new: 2, due: 0 });
    expect(first.cards.map((c) => [c.front, c.back, c.is_new])).toEqual([['reliable', 'ishonchli', true], ['brave', 'jasur, botir', true]]);

    const review = (wordId, grade) => api().post(`/api/mobile/v1/student/flashcards/${wordId}/review`).set(auth(student)).send({ grade });
    const easy = (await review(first.cards[0].word_id, 'easy')).body;
    const hard = (await review(first.cards[1].word_id, 'hard')).body;
    expect(easy.interval_days).toBe(4);
    expect(hard.interval_days).toBe(1);
    expect(new Date(easy.due_at).getTime()).toBeGreaterThan(new Date(hard.due_at).getTime());
    expect((await review(first.cards[0].word_id, 'perfect')).status).toBe(400);

    // A word of a group the student is not in (Bobur is only in B1) cannot be reviewed.
    const ielts = (await pool.query("SELECT class_id FROM classes WHERE class_name = 'IELTS'")).rows[0].class_id;
    const ieltsSet = (await pool.query(
      `INSERT INTO consolidation_sets (center_id, class_id, session_id, teacher_id, title, share_token)
       VALUES ($1, $2, $3, $4, 'IELTS words', 'flash-test-2') RETURNING consolidation_set_id`,
      [centerId, ielts, sessionId, b1.teacher_id],
    )).rows[0].consolidation_set_id;
    const ieltsWord = (await pool.query(
      `INSERT INTO consolidation_words (consolidation_set_id, word_order, main_word, translations) VALUES ($1, 1, 'thrive', '["gullab-yashnamoq"]')
       RETURNING consolidation_word_id`,
      [ieltsSet],
    )).rows[0].consolidation_word_id;
    const bobur = (await mobileAuth.login({ username: 'bobur', password: 'secret-pass', ...device('bob-cards') })).access_token;
    expect((await api().post(`/api/mobile/v1/student/flashcards/${ieltsWord}/review`).set(auth(bobur)).send({ grade: 'good' })).status).toBe(404);
    await pool.query('DELETE FROM consolidation_sets WHERE consolidation_set_id = $1', [ieltsSet]);

    const after = (await api().get('/api/mobile/v1/student/flashcards').set(auth(student))).body;
    expect(after.cards).toEqual([]);
    expect(after.stats).toMatchObject({ total: 2, new: 0, due: 0 });
  });

  // @MOB-172 @MOB-175 The app is installed from the website: admins publish versions, the app checks them.
  test('app releases: admin publishes a Drive link, app-config and the download link follow it', async () => {
    await pool.query('TRUNCATE mobile_app_releases RESTART IDENTITY');
    const { generateToken } = require('../../../src/middleware/auth');
    const adminToken = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    const admin = () => api().post('/api/mobile-admin/releases').set(auth(adminToken));

    expect((await api().get('/api/mobile/v1/download')).status).toBe(404);
    expect((await api().get('/api/mobile/v1/app-config')).body).toMatchObject({ latest_version: null, download_url: null });

    const first = await admin().send({ version: '1.0.0', download_url: 'https://drive.google.com/file/d/APK1/view?usp=sharing' });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ version: '1.0.0', min_version: '1.0.0', download_url: 'https://drive.usercontent.google.com/download?id=APK1&export=download&confirm=t', created_by_name: 'admin1' });
    expect((await admin().send({ version: '1.0.0', download_url: 'https://x' })).body.code).toBe('NOT_NEWER');
    expect((await admin().send({ version: '1.1.0', min_version: '1.1.0', download_url: 'https://drive.google.com/file/d/APK2/view', notes: 'Yangi' })).status).toBe(201);

    const config = (await api().get('/api/mobile/v1/app-config')).body;
    expect(config).toMatchObject({ min_app_version: '1.1.0', latest_version: '1.1.0', download_url: 'https://drive.usercontent.google.com/download?id=APK2&export=download&confirm=t', release_notes: 'Yangi' });
    const download = await api().get('/api/mobile/v1/download');
    expect(download.status).toBe(302);
    expect(download.headers.location).toBe('https://drive.usercontent.google.com/download?id=APK2&export=download&confirm=t');
    expect((await api().get('/api/mobile-admin/releases').set(auth(adminToken))).body.items.map((r) => r.version)).toEqual(['1.1.0', '1.0.0']);

    // Only admins publish.
    const teacher = generateToken({ id: 1, userType: 'teacher', role: 'teacher', center_id: centerId });
    expect((await api().post('/api/mobile-admin/releases').set(auth(teacher)).send({ version: '9.9.9', download_url: 'https://x' })).status).toBe(403);
    expect((await api().post('/api/mobile-admin/releases').send({ version: '9.9.9', download_url: 'https://x' })).status).toBe(401);
  });
});
