const bcrypt = require('bcryptjs');
const request = require('supertest');

// The share link journey against a real database: mint a link, open it without a
// session, and confirm who is let through and who is not.
describe('test share links with PostgreSQL', () => {
  let app;
  let server;
  let pool;
  let centerId;
  let otherCenterId;
  let teacherId;
  let classId;
  let assignedStudentId;
  let unassignedStudentId;
  let testId;
  let adminToken;
  let shareToken;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');

    centerId = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code) VALUES ('Share Center', 'SH-A') RETURNING center_id`
    )).rows[0].center_id;
    otherCenterId = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code) VALUES ('Other Center', 'SH-B') RETURNING center_id`
    )).rows[0].center_id;

    await pool.query(
      `INSERT INTO superusers (center_id, username, password_hash, role, permissions, status)
       VALUES ($1, 'share_admin', $2, 'admin', '[]'::jsonb, 'Active')`,
      [centerId, bcrypt.hashSync('password-a', 10)]
    );

    teacherId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'SH-T1', 'Ada', 'Teacher') RETURNING teacher_id`,
      [centerId]
    )).rows[0].teacher_id;

    classId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'Share Group', 'SH-C1', $2) RETURNING class_id`,
      [centerId, teacherId]
    )).rows[0].class_id;

    assignedStudentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, class_id, status)
       VALUES ($1, 'SH-S1', 'Assigned', 'Student', 'assigned_student', $2, 'Active') RETURNING student_id`,
      [centerId, classId]
    )).rows[0].student_id;

    unassignedStudentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, status)
       VALUES ($1, 'SH-S2', 'Unassigned', 'Student', 'unassigned_student', 'Active') RETURNING student_id`,
      [centerId]
    )).rows[0].student_id;

    await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, status)
       VALUES ($1, 'SH-S3', 'Outside', 'Student', 'outside_student', 'Active')`,
      [otherCenterId]
    );

    testId = (await pool.query(
      `INSERT INTO tests (center_id, test_name, test_type, total_marks, passing_marks, duration_minutes,
                          created_by, created_by_type, is_active, allow_retake, max_retakes)
       VALUES ($1, 'Shared Unit Test', 'multiple_choice', 10, 5, 30, $2, 'teacher', true, false, 1)
       RETURNING test_id`,
      [centerId, teacherId]
    )).rows[0].test_id;

    await pool.query(
      `INSERT INTO test_questions (center_id, test_id, question_text, question_type, marks, question_order, options, correct_answer)
       VALUES ($1, $2, 'Choose B', 'multiple_choice', 10, 1, $3::jsonb, $4::jsonb)`,
      [centerId, testId, JSON.stringify(['A', 'B']), JSON.stringify({ index: 1 })]
    );

    await pool.query(
      `INSERT INTO test_assignments (center_id, test_id, assigned_to_type, assigned_to_id, assigned_by, is_mandatory)
       VALUES ($1, $2, 'class', $3, $4, true)`,
      [centerId, testId, classId, teacherId]
    );

    const { createApp } = require('../../../src/index');
    app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });

    const login = await request(server)
      .post('/api/superusers/auth/login')
      .send({ username: 'share_admin', password: 'password-a' });
    expect(login.status).toBe(200);
    adminToken = login.body.token;
  });

  afterAll(async () => {
    if (server) {
      server.closeIdleConnections?.();
      server.closeAllConnections?.();
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
    if (pool) await pool.end();
  });

  test('minting a link requires a session and returns a token', async () => {
    const anonymous = await request(server).post(`/api/tests/${testId}/share`);
    expect(anonymous.status).toBe(401);

    const response = await request(server)
      .post(`/api/tests/${testId}/share`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(201);
    expect(typeof response.body.share_token).toBe('string');
    shareToken = response.body.share_token;

    const stored = (await pool.query('SELECT share_token FROM tests WHERE test_id = $1', [testId])).rows[0];
    expect(stored.share_token).toBe(shareToken);
  });

  test('the public cover opens without a session and carries no questions', async () => {
    const response = await request(server).get(`/api/share/tests/${shareToken}`);

    expect(response.status).toBe(200);
    expect(response.body.test_name).toBe('Shared Unit Test');
    expect(response.body).not.toHaveProperty('questions');
    expect(response.body).not.toHaveProperty('test_id');
    expect(response.body).not.toHaveProperty('center_id');
  });

  test('an unknown token reveals nothing', async () => {
    const response = await request(server).get('/api/share/tests/not-a-real-token');

    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain('Shared Unit Test');
  });

  test('an unknown username and an unassigned student get the same answer', async () => {
    const unknown = await request(server)
      .post(`/api/share/tests/${shareToken}/start`)
      .send({ username: 'nobody_here' });
    const unassigned = await request(server)
      .post(`/api/share/tests/${shareToken}/start`)
      .send({ username: 'unassigned_student' });

    expect(unknown.status).toBe(403);
    expect(unassigned.status).toBe(403);
    expect(unknown.body).toEqual(unassigned.body);

    const created = (await pool.query('SELECT COUNT(*)::int AS count FROM test_submissions WHERE test_id = $1', [testId])).rows[0];
    expect(created.count).toBe(0);
  });

  test('a student from another center is refused even with a real username', async () => {
    const response = await request(server)
      .post(`/api/share/tests/${shareToken}/start`)
      .send({ username: 'outside_student' });

    expect(response.status).toBe(403);
  });

  test('an assigned student starts an attempt and gets its own secret', async () => {
    const response = await request(server)
      .post(`/api/share/tests/${shareToken}/start`)
      .send({ username: 'assigned_student' });

    expect(response.status).toBe(201);
    expect(response.body.submission.student_id).toBe(assignedStudentId);
    expect(typeof response.body.access_token).toBe('string');

    const stored = (await pool.query(
      'SELECT status, access_token, ip_address FROM test_submissions WHERE submission_id = $1',
      [response.body.submission.submission_id]
    )).rows[0];
    expect(stored.status).toBe('in_progress');
    expect(stored.access_token).toBe(response.body.access_token);
    expect(stored.ip_address).toBeTruthy();
  });

  test('the paper opens with the secret and hides the marking scheme', async () => {
    const submission = (await pool.query(
      'SELECT submission_id, access_token FROM test_submissions WHERE test_id = $1 ORDER BY submission_id DESC LIMIT 1',
      [testId]
    )).rows[0];

    const wrongSecret = await request(server)
      .get(`/api/share/tests/${shareToken}/submissions/${submission.submission_id}`)
      .query({ access_token: 'wrong' });
    expect(wrongSecret.status).toBe(404);

    const response = await request(server)
      .get(`/api/share/tests/${shareToken}/submissions/${submission.submission_id}`)
      .query({ access_token: submission.access_token });

    expect(response.status).toBe(200);
    expect(response.body.test.questions).toHaveLength(1);
    expect(response.body.test.questions[0]).not.toHaveProperty('correct_answer');
    expect(response.body.test.questions[0]).not.toHaveProperty('explanation');
    expect(JSON.stringify(response.body)).not.toContain('"index":1');
  });

  test('handing in grades the attempt and retires the secret', async () => {
    const submission = (await pool.query(
      'SELECT submission_id, access_token FROM test_submissions WHERE test_id = $1 ORDER BY submission_id DESC LIMIT 1',
      [testId]
    )).rows[0];
    const questionId = (await pool.query('SELECT question_id FROM test_questions WHERE test_id = $1', [testId])).rows[0].question_id;

    const response = await request(server)
      .post(`/api/share/tests/${shareToken}/submissions/${submission.submission_id}/submit`)
      .send({
        access_token: submission.access_token,
        answers: { [questionId]: 1 },
        time_taken_seconds: 120,
      });

    expect(response.status).toBe(200);

    const stored = (await pool.query(
      'SELECT status, obtained_marks, access_token FROM test_submissions WHERE submission_id = $1',
      [submission.submission_id]
    )).rows[0];
    expect(stored.status).toBe('graded');
    expect(Number(stored.obtained_marks)).toBe(10);
    expect(stored.access_token).toBeNull();

    const reopened = await request(server)
      .get(`/api/share/tests/${shareToken}/submissions/${submission.submission_id}`)
      .query({ access_token: submission.access_token });
    expect(reopened.status).toBe(404);
  });

  test('a second attempt is refused when the test does not allow retakes', async () => {
    const response = await request(server)
      .post(`/api/share/tests/${shareToken}/start`)
      .send({ username: 'assigned_student' });

    expect(response.status).toBe(409);
  });

  test('replacing the link kills the previous one', async () => {
    const rotated = await request(server)
      .post(`/api/tests/${testId}/share`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(rotated.status).toBe(201);
    expect(rotated.body.share_token).not.toBe(shareToken);

    const old = await request(server).get(`/api/share/tests/${shareToken}`);
    expect(old.status).toBe(404);

    const fresh = await request(server).get(`/api/share/tests/${rotated.body.share_token}`);
    expect(fresh.status).toBe(200);

    shareToken = rotated.body.share_token;
  });

  test('turning the link off closes it for good', async () => {
    const revoked = await request(server)
      .delete(`/api/tests/${testId}/share`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(revoked.status).toBe(200);

    const response = await request(server).get(`/api/share/tests/${shareToken}`);
    expect(response.status).toBe(404);

    const stored = (await pool.query('SELECT share_token FROM tests WHERE test_id = $1', [testId])).rows[0];
    expect(stored.share_token).toBeNull();
  });

  test('the statistics endpoint counts this centre only', async () => {
    const response = await request(server)
      .get('/api/tests/statistics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.totals.tests).toBe(1);
    expect(response.body.totals.submissions).toBe(1);
    expect(response.body.by_type).toEqual([{ test_type: 'multiple_choice', tests: 1 }]);
    expect(response.body.by_teacher[0]).toMatchObject({ teacher_id: teacherId, tests: 1, ranked: false });
    expect(response.body.ranking.minimum_graded_submissions).toBe(20);
  });

  test('statistics are not reachable without a session', async () => {
    const response = await request(server).get('/api/tests/statistics');

    expect(response.status).toBe(401);
  });
});
