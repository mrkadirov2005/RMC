const request = require('supertest');

// The built-in English level tests: an admin installs them into the center once (again adds
// nothing), and a student's answers are graded the moment they submit, pass mark 70%.
describe('English level tests with PostgreSQL', () => {
  let pool;
  let server;
  let service;
  let centerId;
  let studentId;
  let admin;
  let teacher;

  const api = () => request(server);
  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Level Center', 'LV-C') RETURNING center_id`)).rows[0].center_id;
    const teacherId = (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'LV-T', 'T', 'T') RETURNING teacher_id`, [centerId])).rows[0].teacher_id;
    studentId = (await pool.query(
      `INSERT INTO students (center_id, enrollment_number, first_name, last_name, teacher_id, status) VALUES ($1, 'LV-S', 'Lola', 'S', $2, 'Active') RETURNING student_id`,
      [centerId, teacherId]
    )).rows[0].student_id;
    const { generateToken } = require('../../../src/middleware/auth');
    admin = generateToken({ id: 1, userType: 'superuser', role: 'admin', center_id: centerId, username: 'admin1' });
    teacher = generateToken({ id: teacherId, userType: 'teacher', role: 'teacher', center_id: centerId, username: 't1' });
    service = require('../../../src/modules/tests/services/test.service');
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

  test('an admin installs the seven level tests once; teachers can see the library but not install', async () => {
    const before = (await api().get('/api/tests/library/english-levels').set(auth(teacher))).body.items;
    expect(before.map((item) => item.level)).toEqual(['Beginner', 'A1', 'A2', 'A2+', 'B1', 'B2', 'C1']);
    expect(before.every((item) => item.installed_test_id === null && item.questions === 30)).toBe(true);

    expect((await api().post('/api/tests/library/english-levels/install').set(auth(teacher))).status).toBe(403);
    const first = await api().post('/api/tests/library/english-levels/install').set(auth(admin));
    expect(first.status).toBe(201);
    expect(first.body.created).toHaveLength(7);
    const again = await api().post('/api/tests/library/english-levels/install').set(auth(admin));
    expect(again.body).toMatchObject({ created: [], already_installed: 7 });

    const counts = (await pool.query(
      `SELECT t.test_name, t.total_marks, t.passing_marks, t.test_data->'level_test'->>'level' AS level,
              (SELECT COUNT(*)::int FROM test_questions q WHERE q.test_id = t.test_id) AS questions,
              (SELECT COUNT(*)::int FROM test_questions q WHERE q.test_id = t.test_id AND q.passage_id IS NOT NULL) AS reading
         FROM tests t WHERE t.center_id = $1 ORDER BY t.test_id`,
      [centerId]
    )).rows;
    expect(counts).toHaveLength(7);
    counts.forEach((row) => expect(row).toMatchObject({ total_marks: 30, questions: 30, reading: 8 }));
    expect(Number(counts[0].passing_marks)).toBe(21);
  });

  const takeB1 = async (choose) => {
    const testId = (await pool.query(`SELECT test_id FROM tests WHERE center_id = $1 AND test_data->'level_test'->>'level' = 'B1'`, [centerId])).rows[0].test_id;
    const questions = (await pool.query('SELECT question_id, question_type, correct_answer, options FROM test_questions WHERE test_id = $1 ORDER BY question_order', [testId])).rows;
    const submission = await service.startTest(testId, { student_id: studentId }, {}, centerId, { id: studentId, userType: 'student' });
    return service.submitTest(submission.submission_id, { time_taken_seconds: 900, answers: questions.map((question) => ({ question_id: question.question_id, student_answer: choose(question) })) }, centerId);
  };

  test('a student who answers everything right passes at once with 30/30', async () => {
    const result = await takeB1((question) => (question.question_type === 'true_false' ? { value: question.correct_answer.value } : { index: question.correct_answer.index }));
    expect(result).toMatchObject({ status: 'graded', is_passed: true });
    expect(Number(result.obtained_marks)).toBe(30);
  });

  test('always picking the first option fails', async () => {
    const result = await takeB1((question) => (question.question_type === 'true_false' ? { value: true } : { index: 0 }));
    expect(result.status).toBe('graded');
    expect(result.is_passed).toBe(false);
    expect(Number(result.obtained_marks)).toBeLessThan(21);
  });
});
