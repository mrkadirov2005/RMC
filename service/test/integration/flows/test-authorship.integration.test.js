const bcrypt = require('bcryptjs');
const request = require('supertest');
const { generateToken } = require('../../../src/middleware/auth');

// Authorship against a real database: who may change a test, who is recorded as
// its author, and the counts the teacher's list depends on.
describe('test authorship with PostgreSQL', () => {
  let app;
  let server;
  let pool;
  let centerId;
  let authorId;
  let colleagueId;
  let classId;
  let studentId;
  let testId;
  let questionId;
  let authorToken;
  let colleagueToken;
  let adminToken;

  const tokenFor = (id, userType, extra = {}) =>
    generateToken({ id, userType, center_id: centerId, ...extra });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');

    centerId = (await pool.query(
      `INSERT INTO edu_centers (center_name, center_code) VALUES ('Authorship Center', 'AU-A') RETURNING center_id`
    )).rows[0].center_id;

    authorId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name, status) VALUES ($1, 'AU-T1', 'Ada', 'Author', 'Active') RETURNING teacher_id`,
      [centerId]
    )).rows[0].teacher_id;
    colleagueId = (await pool.query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name, status) VALUES ($1, 'AU-T2', 'Grace', 'Colleague', 'Active') RETURNING teacher_id`,
      [centerId]
    )).rows[0].teacher_id;

    await pool.query(
      `INSERT INTO superusers (center_id, username, password_hash, role, permissions, status)
       VALUES ($1, 'au_admin', $2, 'admin', '[]'::jsonb, 'Active')`,
      [centerId, bcrypt.hashSync('password-a', 10)]
    );

    classId = (await pool.query(
      `INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'Group', 'AU-C1', $2) RETURNING class_id`,
      [centerId, authorId]
    )).rows[0].class_id;
    studentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id, status)
       VALUES ($1, 'AU-S1', 'Sam', 'Student', $2, $3, 'Active') RETURNING student_id`,
      [centerId, classId, authorId]
    )).rows[0].student_id;

    testId = (await pool.query(
      `INSERT INTO tests (center_id, test_name, test_type, total_marks, passing_marks, duration_minutes,
                          created_by, created_by_type, is_active, is_private)
       VALUES ($1, 'Author Test', 'multiple_choice', 10, 5, 30, $2, 'teacher', true, false) RETURNING test_id`,
      [centerId, authorId]
    )).rows[0].test_id;
    questionId = (await pool.query(
      `INSERT INTO test_questions (center_id, test_id, question_text, question_type, marks, question_order)
       VALUES ($1, $2, 'Original question', 'essay', 10, 1) RETURNING question_id`,
      [centerId, testId]
    )).rows[0].question_id;
    await pool.query(
      `INSERT INTO test_questions (center_id, test_id, question_text, question_type, marks, question_order)
       VALUES ($1, $2, 'Second question', 'essay', 5, 2)`,
      [centerId, testId]
    );
    await pool.query(
      `INSERT INTO test_submissions (center_id, test_id, student_id, status) VALUES
       ($1, $2, $3, 'submitted'), ($1, $2, $3, 'graded'), ($1, $2, $3, 'in_progress')`,
      [centerId, testId, studentId]
    );

    const { createApp } = require('../../../src/index');
    app = await createApp({ initializeDatabase: false, initializeMongo: false });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });

    authorToken = tokenFor(authorId, 'teacher');
    colleagueToken = tokenFor(colleagueId, 'teacher');
    const login = await request(server).post('/api/superusers/auth/login').send({ username: 'au_admin', password: 'password-a' });
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

  test('the list carries question, submission and grading counts', async () => {
    const response = await request(server).get('/api/tests').set('Authorization', `Bearer ${authorToken}`);

    expect(response.status).toBe(200);
    const row = response.body.find((test) => test.test_id === testId);
    expect(row).toMatchObject({ question_count: 2, submission_count: 2, awaiting_grading_count: 1 });
  });

  test('a colleague cannot update the test', async () => {
    const response = await request(server)
      .put(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${colleagueToken}`)
      .send({ test_name: 'Hijacked' });

    expect(response.status).toBe(403);
    const stored = (await pool.query('SELECT test_name FROM tests WHERE test_id = $1', [testId])).rows[0];
    expect(stored.test_name).toBe('Author Test');
  });

  test('a colleague cannot edit, add or delete questions', async () => {
    const edit = await request(server)
      .put(`/api/tests/questions/${questionId}`)
      .set('Authorization', `Bearer ${colleagueToken}`)
      .send({ question_text: 'Hijacked' });
    const add = await request(server)
      .post(`/api/tests/${testId}/questions`)
      .set('Authorization', `Bearer ${colleagueToken}`)
      .send({ question_text: 'Extra', question_type: 'essay', marks: 1 });
    const remove = await request(server)
      .delete(`/api/tests/questions/${questionId}`)
      .set('Authorization', `Bearer ${colleagueToken}`);

    expect([edit.status, add.status, remove.status]).toEqual([403, 403, 403]);
    const count = (await pool.query('SELECT COUNT(*)::int AS count FROM test_questions WHERE test_id = $1', [testId])).rows[0].count;
    expect(count).toBe(2);
  });

  test('a colleague cannot delete the test', async () => {
    const response = await request(server).delete(`/api/tests/${testId}`).set('Authorization', `Bearer ${colleagueToken}`);

    expect(response.status).toBe(403);
    const exists = (await pool.query('SELECT 1 FROM tests WHERE test_id = $1', [testId])).rowCount;
    expect(exists).toBe(1);
  });

  test('the author can update the test and its questions', async () => {
    const test = await request(server)
      .put(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ test_name: 'Author Test v2' });
    const question = await request(server)
      .put(`/api/tests/questions/${questionId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ question_text: 'Edited question' });

    expect(test.status).toBe(200);
    expect(question.status).toBe(200);
    const stored = (await pool.query('SELECT question_text FROM test_questions WHERE question_id = $1', [questionId])).rows[0];
    expect(stored.question_text).toBe('Edited question');
  });

  test('a question cannot be moved into another test through an update', async () => {
    const otherTestId = (await pool.query(
      `INSERT INTO tests (center_id, test_name, test_type, created_by, created_by_type, is_active)
       VALUES ($1, 'Other', 'essay', $2, 'teacher', true) RETURNING test_id`,
      [centerId, authorId]
    )).rows[0].test_id;

    const response = await request(server)
      .put(`/api/tests/questions/${questionId}`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ test_id: otherTestId, question_text: 'Still here' });

    expect(response.status).toBe(200);
    const stored = (await pool.query('SELECT test_id FROM test_questions WHERE question_id = $1', [questionId])).rows[0];
    expect(stored.test_id).toBe(testId);
  });

  test('a superuser can update any test', async () => {
    const response = await request(server)
      .put(`/api/tests/${testId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ test_name: 'Admin edit' });

    expect(response.status).toBe(200);
  });

  test('a new test records the signed-in teacher as author, whatever the body claims', async () => {
    const response = await request(server)
      .post('/api/tests')
      .set('Authorization', `Bearer ${colleagueToken}`)
      .send({ test_name: 'Spoofed author', test_type: 'essay', created_by: authorId, created_by_type: 'teacher' });

    expect(response.status).toBe(201);
    const stored = (await pool.query('SELECT created_by, created_by_type FROM tests WHERE test_id = $1', [response.body.test.test_id])).rows[0];
    expect(stored).toEqual({ created_by: colleagueId, created_by_type: 'teacher' });
  });
});
