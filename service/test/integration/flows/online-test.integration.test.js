describe('online test lifecycle with PostgreSQL', () => {
  let pool;
  let service;
  let centerId;
  let otherCenterId;
  let teacherId;
  let otherTeacherId;
  let classId;
  let studentId;
  let outsiderId;
  let testId;
  let objectiveQuestionId;
  let manualQuestionId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Test Center', 'TEST-A') RETURNING center_id`)).rows[0].center_id;
    otherCenterId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Other Test Center', 'TEST-B') RETURNING center_id`)).rows[0].center_id;
    teacherId = (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'TEST-T1', 'Create', 'Teacher') RETURNING teacher_id`, [centerId])).rows[0].teacher_id;
    otherTeacherId = (await pool.query(`INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'TEST-T2', 'Other', 'Teacher') RETURNING teacher_id`, [centerId])).rows[0].teacher_id;
    classId = (await pool.query(`INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'Test Class', 'TEST-C', $2) RETURNING class_id`, [centerId, teacherId])).rows[0].class_id;
    studentId = (await pool.query(`INSERT INTO students (center_id, enrollment_number, first_name, last_name, class_id, teacher_id) VALUES ($1, 'TEST-S1', 'Assigned', 'Student', $2, $3) RETURNING student_id`, [centerId, classId, teacherId])).rows[0].student_id;
    outsiderId = (await pool.query(`INSERT INTO students (center_id, enrollment_number, first_name, last_name) VALUES ($1, 'TEST-OUT', 'Outside', 'Student') RETURNING student_id`, [otherCenterId])).rows[0].student_id;
    service = require('../../../src/modules/tests/services/test.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('creates test, passage, and questions in one transaction', async () => {
    const created = await service.createTest({
      center_id: centerId, test_name: 'Integration Test', test_type: 'multiple_choice', total_marks: 10, passing_marks: 5,
      created_by: teacherId, created_by_type: 'teacher', is_private: true,
      passages: [{ title: 'Reading', content: 'Text', passage_order: 1 }],
      questions: [
        { question_text: 'Choose B', question_type: 'multiple_choice', marks: 4, question_order: 1, options: ['A', 'B'], correct_answer: 'B' },
        { question_text: 'Explain', question_type: 'essay', marks: 6, question_order: 2 },
      ],
    });
    testId = created.test.test_id;
    objectiveQuestionId = created.questions[0].question_id;
    manualQuestionId = created.questions[1].question_id;
    expect(created.passages).toHaveLength(1); expect(created.questions).toHaveLength(2);
    expect(Number((await pool.query('SELECT COUNT(*) count FROM tests WHERE test_id=$1', [testId])).rows[0].count)).toBe(1);
  });

  test('private visibility allows creator and associated student but rejects unrelated teacher', async () => {
    await expect(service.getTestById(testId, centerId, { id: teacherId, userType: 'teacher' })).resolves.toMatchObject({ test_id: testId });
    await expect(service.getTestById(testId, centerId, { id: otherTeacherId, userType: 'teacher' })).resolves.toBeNull();
    await expect(service.getTestById(testId, centerId, { id: studentId, userType: 'student' })).resolves.toMatchObject({ test_id: testId });
  });

  test('assignment is idempotent and records actor metadata', async () => {
    const body = { assigned_to_type: 'student', assigned_to_id: studentId, due_date: '2026-09-01', is_mandatory: true };
    const first = await service.assignTest(testId, body, { userId: teacherId }, centerId);
    const second = await service.assignTest(testId, body, { userId: teacherId }, centerId);
    expect(first).toHaveLength(1); expect(second).toHaveLength(1);
    expect(Number((await pool.query('SELECT COUNT(*) count FROM test_assignments WHERE test_id=$1 AND assigned_to_id=$2', [testId, studentId])).rows[0].count)).toBe(1);
  });

  test('start rejects another-center student and creates an in-progress assigned submission', async () => {
    await expect(service.startTest(testId, { student_id: outsiderId }, {}, centerId, { id: outsiderId, userType: 'student' })).resolves.toBeNull();
    const submission = await service.startTest(testId, { student_id: studentId }, { ip: '127.0.0.1' }, centerId, { id: studentId, userType: 'student' });
    expect(submission).toMatchObject({ test_id: testId, student_id: studentId, status: 'in_progress', ip_address: '127.0.0.1' });
  });

  test('submit accepts only questions from the center and persists answers once', async () => {
    const submission = (await pool.query('SELECT submission_id FROM test_submissions WHERE test_id=$1 AND student_id=$2', [testId, studentId])).rows[0];
    const invalid = await service.submitTest(submission.submission_id, { answers: [{ question_id: 999999, student_answer: 'x' }] }, centerId);
    expect(invalid).toEqual({ error: 'invalid_center' });
    const updated = await service.submitTest(submission.submission_id, {
      time_taken_seconds: 120,
      answers: [
        { question_id: objectiveQuestionId, student_answer: 'B', is_correct: true, marks_obtained: 4, graded: true },
        { question_id: manualQuestionId, student_answer: 'Because...', marks_obtained: 3, graded: true },
      ],
    }, centerId);
    expect(updated).toMatchObject({ status: 'submitted', time_taken_seconds: 120 });
    expect(Number((await pool.query('SELECT COUNT(*) count FROM test_answers WHERE submission_id=$1', [submission.submission_id])).rows[0].count)).toBe(2);
  });

  test('grading recomputes totals and upserts one result summary idempotently', async () => {
    const submissionId = (await pool.query('SELECT submission_id FROM test_submissions WHERE test_id=$1 AND student_id=$2', [testId, studentId])).rows[0].submission_id;
    const graded = await service.gradeSubmission(submissionId, { graded_by: teacherId, graded_by_type: 'teacher', feedback: 'Done' }, centerId);
    expect(graded).toMatchObject({ status: 'graded', total_score: '10.00', obtained_marks: '7.00', percentage: '70.00', is_passed: true });
    await service.gradeSubmission(submissionId, { graded_by: teacherId, graded_by_type: 'teacher' }, centerId);
    expect(Number((await pool.query('SELECT COUNT(*) count FROM test_results_summary WHERE test_id=$1 AND student_id=$2', [testId, studentId])).rows[0].count)).toBe(1);
  });
});
