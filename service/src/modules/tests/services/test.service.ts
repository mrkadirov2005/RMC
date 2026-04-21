const testRepository = require('../repositories/test.repository');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');

const toBool = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const normalizeJson = (value: any, fallback: any = null) => {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

const listTests = async (query: any, centerId?: number) => {
  const conditions: string[] = [];
  const params: any[] = [];
  const scopedCenterId = centerId ?? query.center_id;
  if (scopedCenterId) {
    params.push(scopedCenterId);
    conditions.push(`center_id = $${params.length}`);
  }
  if (query.subject_id) {
    params.push(query.subject_id);
    conditions.push(`subject_id = $${params.length}`);
  }
  if (query.test_type) {
    params.push(query.test_type);
    conditions.push(`test_type = $${params.length}`);
  }
  if (query.is_active !== undefined) {
    params.push(toBool(query.is_active));
    conditions.push(`is_active = $${params.length}`);
  }
  return testRepository.findAll(conditions, params);
};

const getTestById = async (id: number, centerId?: number) => {
  const test = await testRepository.findById(id, centerId);
  if (!test) return null;
  const [questions, passages] = await Promise.all([
    testRepository.findQuestionsByTest(id, centerId ?? Number(test.center_id)),
    testRepository.findPassagesByTest(id, centerId ?? Number(test.center_id)),
  ]);
  return { ...test, questions, passages };
};

const createTest = async (body: any) => {
  const {
    center_id,
    subject_id,
    test_name,
    test_type,
    description,
    instructions,
    total_marks,
    passing_marks,
    duration_minutes,
    assignment_type,
    is_timed,
    shuffle_questions,
    show_results_immediately,
    allow_retake,
    max_retakes,
    test_data,
    created_by,
    created_by_type,
    is_active,
    start_date,
    end_date,
  } = body;

  if (!center_id || !test_name || !test_type || !created_by) {
    return { error: 'validation' as const };
  }

  const test = await testRepository.insertTest([
    center_id,
    subject_id || null,
    test_name,
    test_type,
    description || null,
    instructions || null,
    total_marks ?? 0,
    passing_marks ?? 0,
    duration_minutes ?? 60,
    assignment_type || 'all_students',
    is_timed ?? true,
    shuffle_questions ?? false,
    show_results_immediately ?? true,
    allow_retake ?? false,
    max_retakes ?? 1,
    normalizeJson(test_data, {}),
    created_by,
    created_by_type || 'superuser',
    is_active ?? true,
    start_date || null,
    end_date || null,
  ]);

  // Save passages first (for reading_passage tests)
  const savedPassages: any[] = [];
  if (body.passages && Array.isArray(body.passages) && body.passages.length > 0) {
    for (const passage of body.passages) {
      const savedPassage = await testRepository.insertPassage([
        Number(test.center_id),
        Number(test.test_id),
        passage.title || '',
        passage.content || '',
        passage.word_count || null,
        passage.difficulty_level || 'medium',
        passage.passage_order || 1,
        passage.audio_url || null,
        passage.image_url || null,
      ]);
      savedPassages.push(savedPassage);
    }
  }

  // Save questions
  const savedQuestions: any[] = [];
  if (body.questions && Array.isArray(body.questions) && body.questions.length > 0) {
    for (const q of body.questions) {
      const savedQ = await testRepository.insertQuestion([
        Number(test.center_id),
        Number(test.test_id),
        q.passage_id ? Number(q.passage_id) : null,
        q.question_text || '',
        q.question_type || test.test_type,
        Number(q.marks ?? 1),
        Number(q.negative_marks ?? 0),
        Number(q.question_order ?? 1),
        q.options ? normalizeJson(q.options, null) : null,
        q.correct_answer ? normalizeJson(q.correct_answer, null) : null,
        q.explanation || null,
        q.image_url || null,
        toBool(q.is_required) ?? true,
        q.word_limit ? Number(q.word_limit) : null,
      ]);
      savedQuestions.push(savedQ);
    }
  }

  return { test, questions: savedQuestions, passages: savedPassages };
};

const updateTest = async (id: number, body: any, centerId?: number) => {
  const existing = await testRepository.findById(id, centerId);
  if (!existing) return null;
  return testRepository.updateTest([
    body.subject_id ?? null,
    body.test_name ?? null,
    body.test_type ?? null,
    body.description ?? null,
    body.instructions ?? null,
    body.total_marks ?? null,
    body.passing_marks ?? null,
    body.duration_minutes ?? null,
    body.assignment_type ?? null,
    body.is_timed !== undefined ? toBool(body.is_timed) : null,
    body.shuffle_questions !== undefined ? toBool(body.shuffle_questions) : null,
    body.show_results_immediately !== undefined ? toBool(body.show_results_immediately) : null,
    body.allow_retake !== undefined ? toBool(body.allow_retake) : null,
    body.max_retakes ?? null,
    body.test_data !== undefined ? normalizeJson(body.test_data, null) : null,
    body.is_active !== undefined ? toBool(body.is_active) : null,
    body.start_date ?? null,
    body.end_date ?? null,
  ], id, Number(existing.center_id));
};

const deleteTest = async (id: number, centerId?: number) => {
  const existing = await testRepository.findById(id, centerId);
  if (!existing) return null;
  return testRepository.deleteTest(id, Number(existing.center_id));
};

const addQuestion = async (testId: number, body: any, centerId?: number) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  const question = await testRepository.insertQuestion([
    Number(test.center_id),
    testId,
    body.passage_id || null,
    body.question_text,
    body.question_type,
    body.marks ?? 1,
    body.negative_marks ?? 0,
    body.question_order ?? 1,
    normalizeJson(body.options, null),
    normalizeJson(body.correct_answer, null),
    body.explanation || null,
    body.image_url || null,
    body.is_required !== undefined ? toBool(body.is_required) : true,
    body.word_limit ?? null,
  ]);
  return question;
};

const updateQuestion = async (questionId: number, body: any, centerId?: number) => testRepository.updateQuestion([
  body.test_id ?? null,
  body.passage_id ?? null,
  body.question_text ?? null,
  body.question_type ?? null,
  body.marks ?? null,
  body.negative_marks ?? null,
  body.question_order ?? null,
  body.options !== undefined ? normalizeJson(body.options, null) : null,
  body.correct_answer !== undefined ? normalizeJson(body.correct_answer, null) : null,
  body.explanation ?? null,
  body.image_url ?? null,
  body.is_required !== undefined ? toBool(body.is_required) : null,
  body.word_limit ?? null,
], questionId, centerId);

const deleteQuestion = async (questionId: number, centerId?: number) => testRepository.deleteQuestion(questionId, centerId);

const addPassage = async (testId: number, body: any, centerId?: number) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  return testRepository.insertPassage([
    Number(test.center_id),
    testId,
    body.title,
    body.content,
    body.word_count ?? null,
    body.difficulty_level || 'medium',
    body.passage_order ?? 1,
    body.audio_url || null,
    body.image_url || null,
  ]);
};

const updatePassage = async (passageId: number, body: any, centerId?: number) => testRepository.updatePassage([
  body.test_id ?? null,
  body.title ?? null,
  body.content ?? null,
  body.word_count ?? null,
  body.difficulty_level ?? null,
  body.passage_order ?? null,
  body.audio_url ?? null,
  body.image_url ?? null,
], passageId, centerId);

const deletePassage = async (passageId: number, centerId?: number) => testRepository.deletePassage(passageId, centerId);

const startTest = async (testId: number, body: any, reqMeta: any = {}, centerId?: number) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  const studentId = body.student_id ?? reqMeta.studentId ?? null;
  if (!studentId) return { error: 'validation' as const };
  if (centerId) {
    const ok = await studentInCenter(studentId, Number(test.center_id));
    if (!ok) return { error: 'invalid_center' as const };
  }
  return testRepository.insertSubmission([
    Number(test.center_id),
    testId,
    studentId,
    body.started_at || new Date(),
    body.submitted_at || null,
    body.time_taken_seconds ?? null,
    normalizeJson(body.submission_data, {}),
    body.total_score ?? null,
    body.obtained_marks ?? null,
    body.percentage ?? null,
    body.status || 'in_progress',
    body.is_passed ?? null,
    body.feedback || null,
    body.graded_by ?? null,
    body.graded_by_type || null,
    body.graded_at || null,
    body.attempt_number ?? 1,
    body.ip_address || reqMeta.ip || null,
  ]);
};

const submitTest = async (submissionId: number, body: any, centerId?: number) => {
  const existing = await testRepository.findSubmissionById(submissionId, centerId);
  if (!existing) return null;
  const answers = Array.isArray(body.answers) ? body.answers : [];
  const submissionData = normalizeJson(body.submission_data, existing.submission_data || {});

  const questions = answers.length > 0
    ? await testRepository.getQuestionsByIds(answers.map((answer: any) => answer.question_id), Number(existing.center_id))
    : [];
  if (answers.length > 0 && questions.length !== new Set(answers.map((answer: any) => answer.question_id)).size) {
    return { error: 'invalid_center' as const };
  }

  const updated = await testRepository.updateSubmission([
    body.submitted_at || new Date(),
    body.time_taken_seconds ?? null,
    submissionData,
    body.total_score ?? existing.total_score ?? null,
    body.obtained_marks ?? existing.obtained_marks ?? null,
    body.percentage ?? existing.percentage ?? null,
    body.status || 'submitted',
    body.is_passed ?? existing.is_passed ?? null,
    body.feedback ?? existing.feedback ?? null,
    body.graded_by ?? null,
    body.graded_by_type ?? null,
    body.graded_at ?? null,
    body.attempt_number ?? existing.attempt_number ?? 1,
    body.ip_address ?? existing.ip_address ?? null,
  ], submissionId, Number(existing.center_id));

  await testRepository.deleteAnswersBySubmission(submissionId, Number(existing.center_id));
  for (const answer of answers) {
    await testRepository.insertAnswer([
      Number(existing.center_id),
      submissionId,
      answer.question_id,
      normalizeJson(answer.student_answer, null),
      answer.is_correct ?? null,
      answer.marks_obtained ?? 0,
      answer.feedback ?? null,
      answer.graded ?? false,
      answer.graded_at ?? null,
    ]);
  }

  return updated;
};

const gradeSubmission = async (submissionId: number, body: any, centerId?: number) => {
  const existing = await testRepository.findSubmissionById(submissionId, centerId);
  if (!existing) return null;

  const answers = await testRepository.findAnswersBySubmission(submissionId, Number(existing.center_id));
  const questionIds = answers.map((a: any) => a.question_id);
  const questions = await testRepository.getQuestionsByIds(questionIds, Number(existing.center_id));
  const questionMap = new Map(questions.map((q: any) => [q.question_id, q]));

  let totalMarks = 0;
  let obtainedMarks = 0;

  for (const answer of answers) {
    const question: any = questionMap.get(answer.question_id);
    const questionMarks = Number(question?.marks ?? 0);
    totalMarks += questionMarks;
    obtainedMarks += Number(answer.marks_obtained ?? 0);
  }

  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : null;
  const passed = percentage !== null && body.is_passed !== undefined ? toBool(body.is_passed) : (percentage !== null ? percentage >= 50 : null);

  const updated = await testRepository.updateSubmission([
    body.submitted_at ?? existing.submitted_at ?? null,
    body.time_taken_seconds ?? existing.time_taken_seconds ?? null,
    body.submission_data !== undefined ? normalizeJson(body.submission_data, existing.submission_data || {}) : null,
    body.total_score ?? totalMarks,
    body.obtained_marks ?? obtainedMarks,
    body.percentage ?? percentage,
    'graded',
    passed,
    body.feedback ?? existing.feedback ?? null,
    body.graded_by ?? null,
    body.graded_by_type ?? null,
    body.graded_at ?? new Date(),
    body.attempt_number ?? existing.attempt_number ?? 1,
    body.ip_address ?? existing.ip_address ?? null,
  ], submissionId, Number(existing.center_id));

  const summary = await testRepository.findResultByStudent(existing.test_id, existing.student_id, Number(existing.center_id));
  const bestScoreCandidate = percentage === null ? summary?.best_score ?? null : Number(percentage);
  const bestScore =
    summary?.best_score === undefined || summary?.best_score === null
      ? bestScoreCandidate
      : bestScoreCandidate === null
        ? summary.best_score
        : Math.max(Number(summary.best_score), Number(bestScoreCandidate));
  const avgBase = summary?.average_score === undefined || summary?.average_score === null
    ? bestScoreCandidate
    : ((Number(summary.average_score) * Number(summary.total_attempts || 0)) + Number(bestScoreCandidate || 0)) /
      (Number(summary.total_attempts || 0) + 1);

  await testRepository.upsertResult([
    Number(existing.center_id),
    existing.test_id,
    existing.student_id,
    bestScore,
    avgBase === null || Number.isNaN(avgBase) ? null : Number(Number(avgBase).toFixed(2)),
    Number(summary?.total_attempts || 0) + 1,
    new Date(),
    passed ? new Date() : summary?.first_passed_at || null,
    passed === null ? summary?.is_completed ?? false : Boolean(passed),
    passed === true ? true : Boolean(summary?.certificate_issued || false),
  ]);

  return updated;
};

const getSubmissionDetails = async (submissionId: number, centerId?: number) => {
  const submission = await testRepository.findSubmissionById(submissionId, centerId);
  if (!submission) return null;
  const answers = await testRepository.findAnswersBySubmission(submissionId, Number(submission.center_id));
  return { ...submission, answers };
};

const getSubmissionsByTest = async (testId: number, centerId?: number) => testRepository.findSubmissionsByTest(testId, centerId);

const getSubmissionsByStudent = async (studentId: number, centerId?: number) => testRepository.findSubmissionsByStudent(studentId, centerId);

const getTestResults = async (testId: number, centerId?: number) => testRepository.findResultsByTest(testId, centerId);

const getStudentResults = async (studentId: number, centerId?: number) => {
  return testRepository.findResultsByStudent(studentId, centerId);
};

const assignTest = async (testId: number, body: any, reqMeta: any = {}, centerId?: number) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;

  const assignments: any[] = [];
  const assignedBy = body.assigned_by ?? reqMeta.userId ?? 0;

  const items = Array.isArray(body.assignments)
    ? body.assignments
    : body.assigned_to_type && body.assigned_to_id
      ? [body]
      : [];

  for (const item of items) {
    const assigned = await testRepository.insertAssignment([
      Number(test.center_id),
      testId,
      item.assigned_to_type,
      item.assigned_to_id,
      item.assigned_by ?? assignedBy,
      item.due_date || null,
      item.is_mandatory !== undefined ? toBool(item.is_mandatory) : true,
      item.notes || null,
    ]);
    assignments.push(assigned);
  }

  return assignments;
};

const getAssignedTests = async (type: string, id: number, centerId?: number) => testRepository.findAssignedTests(type, id, centerId);

const deleteAssignmentsByTest = async (testId: number, centerId?: number) => testRepository.deleteAssignmentsByTest(testId, centerId);

module.exports = {
  listTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  addPassage,
  updatePassage,
  deletePassage,
  startTest,
  submitTest,
  gradeSubmission,
  getSubmissionsByTest,
  getSubmissionDetails,
  getSubmissionsByStudent,
  getTestResults,
  getStudentResults,
  assignTest,
  getAssignedTests,
  deleteAssignmentsByTest,
};

export {};
