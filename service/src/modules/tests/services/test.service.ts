const crypto = require('crypto');
const testRepository = require('../repositories/test.repository');
const pool = require('../../../db/pool');
const { studentInCenter, classInCenter } = require('../../../shared/tenantDb');
const studentService = require('../../students/services/student.service');
const { getQuestionTypeMeta, gradeObjectiveAnswer, isAutoGradable } = require('../questionTypes');

const toBool = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const normalizeJson = (value: any, fallback: any = null, context = 'test.service') => {
  if (value === undefined) return fallback;
  if (value === null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      console.warn(`[${context}] failed to parse JSON value, keeping raw string:`, value.slice(0, 200));
      return value;
    }
  }
  return value;
};

const isOwnerUser = (user: any) =>
  Boolean(user && user.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner');

const isCreatorScopedUser = (user: any) =>
  Boolean(user && (
    user.userType === 'teacher' ||
    (user.userType === 'superuser' && String(user.role || '').toLowerCase() !== 'owner')
  ));

const getStudentTeacherId = async (studentId: number, centerId?: number) => {
  const student = await studentService.getStudent(studentId, centerId ?? undefined);
  return student?.teacher_id ?? null;
};

const canViewTest = async (test: any, user: any, centerId?: number) => {
  if (!test) return false;
  if (isOwnerUser(user)) return true;
  if (!Boolean(test.is_private)) return true;
  if (!user) return false;

  if (isCreatorScopedUser(user)) {
    return Number(test.created_by) === Number(user.id);
  }

  if (user.userType === 'student') {
    const teacherId = await getStudentTeacherId(Number(user.id), centerId ?? Number(test.center_id));
    return teacherId !== null && Number(teacherId) === Number(test.created_by);
  }

  return false;
};

const withTransaction = async (handler: (db: any) => Promise<any>) => {
  return pool.db.transaction(handler);
};

const listTests = async (query: any, centerId?: number, user?: any) => {
  const filters: Record<string, any> = {};
  const scopedCenterId = centerId ?? query.center_id;
  if (scopedCenterId) {
    filters.center_id = scopedCenterId;
  }
  if (query.subject_id) {
    filters.subject_id = query.subject_id;
  }
  if (query.test_type) {
    filters.test_type = query.test_type;
  }
  if (query.is_active !== undefined) {
    filters.is_active = toBool(query.is_active);
  }
  if (isCreatorScopedUser(user)) {
    filters.visible_to_creator_id = Number(user.id);
  } else if (user?.userType === 'student') {
    const teacherId = await getStudentTeacherId(Number(user.id), scopedCenterId ? Number(scopedCenterId) : undefined);
    if (teacherId !== null) {
      filters.visible_to_creator_id = Number(teacherId);
    } else {
      filters.public_only = true;
    }
  }
  return testRepository.findAll(filters);
};

// Students sit the paper; only the people marking it see the scheme. Used by both
// the authenticated reader and the share-link one so the two cannot drift apart.
const toPublicQuestion = (question: any) => {
  const { correct_answer, explanation, rubric, ...rest } = question;
  return rest;
};

// A teacher may only change a test they wrote. Superusers can change any test in
// their centre. Reading, taking and assigning are governed elsewhere.
const canModifyTest = (test: any, user: any) => {
  if (!test || !user) return false;
  if (user.userType === 'superuser' || user.userType === 'owner') return true;
  return user.userType === 'teacher'
    && String(test.created_by_type || 'teacher') === 'teacher'
    && Number(test.created_by) === Number(user.id);
};

// Resolves the test a write targets and decides whether this user may make it.
// `not_found` covers a test outside the caller's centre as well as a missing one.
const checkTestWriteAccess = async (
  target: { testId?: number; questionId?: number; passageId?: number },
  centerId: number | undefined,
  user: any
) => {
  let testId = target.testId ?? null;
  if (testId == null && target.questionId != null) testId = await testRepository.findQuestionTestId(target.questionId, centerId);
  if (testId == null && target.passageId != null) testId = await testRepository.findPassageTestId(target.passageId, centerId);
  if (testId == null) return 'not_found' as const;
  const test = await testRepository.findById(Number(testId), centerId);
  if (!test) return 'not_found' as const;
  return canModifyTest(test, user) ? ('ok' as const) : ('forbidden' as const);
};

const getTestById = async (id: number, centerId?: number, user?: any) => {
  const test = await testRepository.findById(id, centerId);
  if (!test) return null;
  const visible = await canViewTest(test, user, centerId ?? Number(test.center_id));
  if (!visible) return null;
  const [questions, passages] = await Promise.all([
    testRepository.findQuestionsByTest(id, centerId ?? Number(test.center_id)),
    testRepository.findPassagesByTest(id, centerId ?? Number(test.center_id)),
  ]);
  // A student sits the paper; they never receive the marking scheme with it.
  // Sending correct_answer here put the answers one network-tab click away from
  // anyone taking the test.
  const visibleQuestions = user?.userType === 'student' ? questions.map(toPublicQuestion) : questions;
  return { ...test, questions: visibleQuestions, passages };
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
    is_private,
    start_date,
    end_date,
  } = body;

  return withTransaction(async (db) => {
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
      is_private ?? false,
      start_date || null,
      end_date || null,
    ], db);

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
        ], db);
        savedPassages.push(savedPassage);
      }
    }

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
          q.rubric || null,
        ], db);
        savedQuestions.push(savedQ);
      }
    }

    return { test, questions: savedQuestions, passages: savedPassages };
  });
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
    body.is_private !== undefined ? toBool(body.is_private) : null,
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
    body.rubric ?? null,
  ]);
  return question;
};

const updateQuestion = async (questionId: number, body: any, centerId?: number) => testRepository.updateQuestion([
  // Never re-parent a question: it stays on the test it was written for.
  null,
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
  body.rubric ?? null,
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
  // Never re-parent a passage: it stays on the test it was written for.
  null,
  body.title ?? null,
  body.content ?? null,
  body.word_count ?? null,
  body.difficulty_level ?? null,
  body.passage_order ?? null,
  body.audio_url ?? null,
  body.image_url ?? null,
], passageId, centerId);

const deletePassage = async (passageId: number, centerId?: number) => testRepository.deletePassage(passageId, centerId);

const startTest = async (testId: number, body: any, reqMeta: any = {}, centerId?: number, user?: any) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  const visible = await canViewTest(test, user, centerId ?? Number(test.center_id));
  if (!visible) return null;
  const studentId = user?.userType === 'student'
    ? Number(user.id)
    : reqMeta.studentId ?? body.student_id ?? null;
  if (!studentId) return { error: 'validation' as const };
  if (centerId) {
    const ok = await studentInCenter(studentId, Number(test.center_id));
    if (!ok) return { error: 'invalid_center' as const };
  }

  const attempts = await testRepository.countSubmissionsByStudent(Number(test.test_id), studentId, Number(test.center_id));
  const maxRetakes = Number(test.max_retakes ?? 1);
  if (attempts > 0 && (!toBool(test.allow_retake) || attempts >= maxRetakes)) {
    return { error: 'max_retakes' as const };
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

const hasAnswerValue = (value: any) => {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return String(value).trim() !== '';
  if (typeof value.text === 'string') return value.text.trim() !== '';
  if (value.matches) return Object.keys(value.matches).length > 0;
  return value.index !== undefined || value.value !== undefined;
};

const finalizeSubmissionScore = async (submissionId: number, existing: any, status: string, extra: any = {}) => {
  const scopedCenterId = Number(existing.center_id);
  const [test, questions, answers] = await Promise.all([
    testRepository.findById(Number(existing.test_id), scopedCenterId),
    testRepository.findQuestionsByTest(Number(existing.test_id), scopedCenterId),
    testRepository.findAnswersBySubmission(submissionId, scopedCenterId),
  ]);

  const totalMarks = questions.reduce((sum: number, q: any) => sum + Number(q.marks ?? 0), 0);
  const obtainedMarks = answers.reduce((sum: number, a: any) => sum + Number(a.marks_obtained ?? 0), 0);
  const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : null;
  const passingMarks = Number(test?.passing_marks ?? 0);
  const passed = passingMarks > 0
    ? obtainedMarks >= passingMarks
    : percentage !== null ? percentage >= 50 : null;

  const submission = await testRepository.updateSubmission([
    extra.submitted_at ?? existing.submitted_at ?? null,
    extra.time_taken_seconds ?? existing.time_taken_seconds ?? null,
    null,
    totalMarks,
    obtainedMarks,
    percentage,
    status,
    passed,
    extra.feedback ?? existing.feedback ?? null,
    extra.graded_by ?? null,
    extra.graded_by_type ?? null,
    extra.graded_at ?? null,
    existing.attempt_number ?? 1,
    existing.ip_address ?? null,
  ], submissionId, scopedCenterId);

  return { submission, totalMarks, obtainedMarks, percentage, passed };
};

const autoGradeSubmission = async (submissionId: number, centerId?: number) => {
  const answers = await testRepository.findAnswersBySubmission(submissionId, centerId);
  let pendingManual = 0;
  for (const answer of answers) {
    if (!isAutoGradable(answer.question_type)) {
      pendingManual += 1;
      continue;
    }
    const { is_correct, marks_obtained } = gradeObjectiveAnswer(answer, answer.student_answer);
    await testRepository.updateAnswer([
      is_correct,
      marks_obtained,
      null,
      true,
      new Date(),
      null,
      'system',
    ], answer.answer_id, centerId);
  }
  return pendingManual;
};

const submitTest = async (submissionId: number, body: any, centerId?: number) => {
  const existing = await testRepository.findSubmissionById(submissionId, centerId);
  if (!existing) return null;
  const answers = Array.isArray(body.answers)
    ? body.answers
    : body.answers && typeof body.answers === 'object'
      ? Object.entries(body.answers).map(([questionId, studentAnswer]) => ({
        question_id: Number(questionId),
        student_answer: studentAnswer,
      }))
      : [];
  const submissionData = normalizeJson(body.submission_data, existing.submission_data || {});

  const testQuestions = await testRepository.findQuestionsByTest(Number(existing.test_id), Number(existing.center_id));
  const questionMap = new Map(testQuestions.map((q: any) => [Number(q.question_id), q]));

  const scoped = answers.filter((answer: any) => questionMap.has(Number(answer.question_id)));
  if (scoped.length !== answers.length) {
    return { error: 'invalid_center' as const };
  }

  const answerMap = new Map(scoped.map((answer: any) => [Number(answer.question_id), answer]));

  for (const question of testQuestions) {
    const answer: any = answerMap.get(Number(question.question_id));
    const studentAnswer = normalizeJson(answer?.student_answer, null);
    const text = String(studentAnswer?.text ?? '');
    const wordLimit = Number(question.word_limit || 0);
    if (wordLimit > 0 && text.trim().split(/\s+/).filter(Boolean).length > wordLimit) {
      return { error: 'word_limit' as const, question_id: Number(question.question_id) };
    }
    if (question.is_required && !hasAnswerValue(studentAnswer)) {
      return { error: 'required' as const, question_id: Number(question.question_id) };
    }
  }

  const updated = await testRepository.updateSubmission([
    body.submitted_at || new Date(),
    body.time_taken_seconds ?? null,
    submissionData,
    body.total_score ?? existing.total_score ?? null,
    body.obtained_marks ?? existing.obtained_marks ?? null,
    body.percentage ?? existing.percentage ?? null,
    'submitted',
    existing.is_passed ?? null,
    existing.feedback ?? null,
    null,
    null,
    null,
    existing.attempt_number ?? 1,
    existing.ip_address ?? null,
  ], submissionId, Number(existing.center_id));

  await testRepository.deleteAnswersBySubmission(submissionId, Number(existing.center_id));
  for (const answer of scoped) {
    await testRepository.insertAnswer([
      Number(existing.center_id),
      submissionId,
      answer.question_id,
      normalizeJson(answer.student_answer, null),
      null,
      0,
      null,
      false,
      null,
    ]);
  }

  const pendingManual = await autoGradeSubmission(submissionId, Number(existing.center_id));
  const result = await finalizeSubmissionScore(
    submissionId,
    { ...existing, ...updated },
    pendingManual === 0 ? 'graded' : 'submitted'
  );
  return result.submission;
};

const gradeSubmission = async (submissionId: number, body: any, centerId?: number) => {
  const existing = await testRepository.findSubmissionById(submissionId, centerId);
  if (!existing) return null;

  const scopedCenterId = Number(existing.center_id);
  const answers = await testRepository.findAnswersBySubmission(submissionId, scopedCenterId);
  const answerMap = new Map(answers.map((a: any) => [Number(a.question_id), a]));

  const grades = Array.isArray(body.answer_grades) ? body.answer_grades : [];
  for (const grade of grades) {
    const answer: any = answerMap.get(Number(grade.question_id));
    if (!answer) return { error: 'invalid_question' as const, question_id: Number(grade.question_id) };
    const questionMarks = Number(answer.marks ?? 0);
    const raw = Number(grade.marks_obtained ?? 0);
    const marks = Number.isFinite(raw) ? Math.max(0, Math.min(raw, questionMarks)) : 0;
    await testRepository.updateAnswer([
      isAutoGradable(answer.question_type) ? marks === questionMarks : null,
      marks,
      grade.feedback ?? null,
      true,
      new Date(),
      body.graded_by ?? null,
      body.graded_by_type ?? null,
    ], answer.answer_id, scopedCenterId);
  }

  const refreshed = await testRepository.findAnswersBySubmission(submissionId, scopedCenterId);
  const fullyGraded = refreshed.length > 0 && refreshed.every((a: any) => Boolean(a.graded));

  const { submission: updated, percentage, passed } = await finalizeSubmissionScore(
    submissionId,
    existing,
    fullyGraded ? 'graded' : 'submitted',
    {
      feedback: body.feedback,
      graded_by: body.graded_by,
      graded_by_type: body.graded_by_type,
      graded_at: new Date(),
    }
  );

  const summary = await testRepository.findResultByStudent(existing.test_id, existing.student_id, scopedCenterId);
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
  const scopedCenterId = Number(submission.center_id);
  const [answers, test, student] = await Promise.all([
    testRepository.findAnswersBySubmission(submissionId, scopedCenterId),
    testRepository.findById(Number(submission.test_id), scopedCenterId),
    studentService.getStudent(Number(submission.student_id), scopedCenterId),
  ]);

  const pendingManualCount = answers.filter(
    (answer: any) => getQuestionTypeMeta(answer.question_type).manualGraded && !answer.graded
  ).length;

  return {
    ...submission,
    test_name: test?.test_name ?? null,
    test_type: test?.test_type ?? null,
    total_marks: submission.total_score ?? test?.total_marks ?? null,
    passing_marks: test?.passing_marks ?? null,
    first_name: student?.first_name ?? null,
    last_name: student?.last_name ?? null,
    enrollment_number: student?.enrollment_number ?? null,
    score: submission.obtained_marks,
    pending_manual_count: pendingManualCount,
    is_fully_graded: answers.length > 0 && answers.every((answer: any) => Boolean(answer.graded)),
    answers,
  };
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
      item.due_date ? new Date(item.due_date) : null,
      item.is_mandatory !== undefined ? toBool(item.is_mandatory) : true,
      item.notes || null,
    ]);
    assignments.push(assigned);
  }

  return assignments;
};

const getAssignedTests = async (type: string, id: number, centerId?: number) => testRepository.findAssignedTests(type, id, centerId);

const deleteAssignmentsByTest = async (testId: number, centerId?: number) => testRepository.deleteAssignmentsByTest(testId, centerId);

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

const generateShareToken = () => crypto.randomBytes(24).toString('base64url');

const canManageShareLink = (test: any, user: any) =>
  user?.userType === 'superuser' || Number(test?.created_by) === Number(user?.id);

// Minting and rotating are the same write: a fresh token always replaces whatever
// was there, so a leaked link dies the moment a teacher presses Share again.
const rotateShareToken = async (testId: number, centerId?: number, user: any = {}) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  if (!canManageShareLink(test, user)) return { error: 'forbidden' as const };
  const updated = await testRepository.setShareToken(testId, generateShareToken(), centerId);
  return { test: updated, share_token: updated?.share_token ?? null };
};

const revokeShareToken = async (testId: number, centerId?: number, user: any = {}) => {
  const test = await testRepository.findById(testId, centerId);
  if (!test) return null;
  if (!canManageShareLink(test, user)) return { error: 'forbidden' as const };
  await testRepository.setShareToken(testId, null, centerId);
  return { revoked: true as const };
};

// The public view deliberately carries no questions and no roster — only what a
// student needs to recognise the test before they type their username.
const getSharedTestView = async (token: string) => {
  const test = await testRepository.findByShareToken(String(token || '').trim());
  if (!test) return null;
  return {
    test_name: test.test_name,
    test_type: test.test_type,
    description: test.description,
    instructions: test.instructions,
    total_marks: test.total_marks,
    passing_marks: test.passing_marks,
    duration_minutes: test.duration_minutes,
    is_timed: test.is_timed,
  };
};

const startSharedTest = async (token: string, username: string, meta: any = {}) => {
  const test = await testRepository.findByShareToken(String(token || '').trim());
  if (!test) return { error: 'not_found' as const };

  // A username identifies; it does not authenticate. The assignment check below is
  // what actually bounds who can start, and an unknown username returns the same
  // answer as an unassigned one so the link cannot be used to probe the roster.
  const student = await studentService.findByUsername(String(username || '').trim());
  if (!student) return { error: 'not_assigned' as const };
  if (Number(student.center_id) !== Number(test.center_id)) return { error: 'not_assigned' as const };

  const assignment = await testRepository.findAssignmentForStudent(
    Number(test.test_id),
    Number(student.student_id),
    student.class_id == null ? null : Number(student.class_id)
  );
  if (!assignment) return { error: 'not_assigned' as const };

  const attempts = await testRepository.countSubmissionsByStudent(
    Number(test.test_id),
    Number(student.student_id),
    Number(test.center_id)
  );
  const maxRetakes = Number(test.max_retakes ?? 1);
  if (attempts > 0 && (!toBool(test.allow_retake) || attempts >= maxRetakes)) {
    return { error: 'already_submitted' as const, attempts };
  }

  // Ask before creating anything on a repeat attempt, so backing out at the
  // confirmation leaves no stray in_progress row behind.
  if (attempts > 0 && !meta.confirm) {
    return { needs_confirmation: true as const, attempts };
  }

  const submission = await testRepository.insertSubmission([
    Number(test.center_id),
    Number(test.test_id),
    Number(student.student_id),
    new Date(),
    null,
    null,
    {},
    null,
    null,
    null,
    'in_progress',
    null,
    null,
    null,
    null,
    null,
    attempts + 1,
    meta.ipAddress || null,
  ]);

  // The attempt carries its own secret, because every later call from the public
  // take screen arrives without a session to identify the student.
  const accessToken = generateShareToken();
  await testRepository.setSubmissionAccessToken(Number(submission.submission_id), accessToken);

  return {
    submission,
    access_token: accessToken,
    student: {
      student_id: student.student_id,
      first_name: student.first_name,
      last_name: student.last_name,
    },
  };
};

const resolveSharedSubmission = async (shareToken: string, submissionId: number, accessToken: string) => {
  const test = await testRepository.findByShareToken(String(shareToken || '').trim());
  if (!test) return { error: 'not_found' as const };

  const submission = await testRepository.findSubmissionByAccessToken(submissionId, String(accessToken || '').trim());
  if (!submission) return { error: 'not_found' as const };
  if (Number(submission.test_id) !== Number(test.test_id)) return { error: 'not_found' as const };

  return { test, submission };
};

const getSharedSubmission = async (shareToken: string, submissionId: number, accessToken: string) => {
  const resolved = await resolveSharedSubmission(shareToken, submissionId, accessToken);
  if ('error' in resolved) return resolved;
  const { test, submission } = resolved;

  const [questions, passages] = await Promise.all([
    testRepository.findQuestionsByTest(Number(test.test_id), Number(test.center_id)),
    testRepository.findPassagesByTest(Number(test.test_id), Number(test.center_id)),
  ]);

  return {
    submission,
    test: {
      test_id: test.test_id,
      test_name: test.test_name,
      test_type: test.test_type,
      description: test.description,
      instructions: test.instructions,
      total_marks: test.total_marks,
      passing_marks: test.passing_marks,
      duration_minutes: test.duration_minutes,
      is_timed: test.is_timed,
      shuffle_questions: test.shuffle_questions,
      questions: questions.map(toPublicQuestion),
      passages,
    },
  };
};

const submitSharedTest = async (shareToken: string, submissionId: number, accessToken: string, body: any) => {
  const resolved = await resolveSharedSubmission(shareToken, submissionId, accessToken);
  if ('error' in resolved) return resolved;
  const { test, submission } = resolved;

  if (submission.status !== 'in_progress') return { error: 'already_submitted' as const };

  const result = await submitTest(Number(submissionId), body, Number(test.center_id));
  // The link is single-use for this attempt: once the paper is handed in the
  // token stops opening it, so a forwarded URL cannot reopen somebody's answers.
  await testRepository.setSubmissionAccessToken(Number(submissionId), null);
  return result;
};

// ---------------------------------------------------------------------------
// Overview statistics
// ---------------------------------------------------------------------------

// Ranking a teacher on average score alone crowns whoever set one easy test, so
// the leaderboard ranks on pass rate and only ranks a teacher once enough work
// has actually been graded. Below the floor the row still appears, unranked.
const RANKING_SUBMISSION_FLOOR = 20;

const toNumberOrNull = (value: any) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
  return Math.round(value * 10) / 10;
};

const normalizeTeacherRow = (row: any) => ({
  teacher_id: Number(row.teacher_id),
  teacher_name: String(row.teacher_name || '').trim() || `Teacher ${row.teacher_id}`,
  tests: Number(row.tests || 0),
  submissions: Number(row.submissions || 0),
  graded_submissions: Number(row.graded_submissions || 0),
  average_score: toNumberOrNull(row.average_score),
  pass_rate: toNumberOrNull(row.pass_rate),
  ranked: Number(row.graded_submissions || 0) >= RANKING_SUBMISSION_FLOOR,
});

// Ranked teachers first, best pass rate at the top; unranked rows keep a stable
// alphabetical order underneath so the table does not reshuffle between loads.
const compareTeachers = (a: any, b: any) => {
  if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
  if (a.ranked) {
    const byPassRate = (b.pass_rate ?? -1) - (a.pass_rate ?? -1);
    if (byPassRate !== 0) return byPassRate;
    const byAverage = (b.average_score ?? -1) - (a.average_score ?? -1);
    if (byAverage !== 0) return byAverage;
  }
  return a.teacher_name.localeCompare(b.teacher_name);
};

const getStatistics = async (centerId?: number, user: any = {}) => {
  const [totals, byType, byTeacher] = await Promise.all([
    testRepository.statisticsTotals(centerId),
    testRepository.statisticsByType(centerId),
    testRepository.statisticsByTeacher(centerId),
  ]);

  const teachers = byTeacher.map(normalizeTeacherRow).sort(compareTeachers);
  const ranked = teachers.filter((teacher: any) => teacher.ranked);
  const centerMedian = {
    average_score: median(ranked.map((teacher: any) => teacher.average_score).filter((value: any) => value != null)),
    pass_rate: median(ranked.map((teacher: any) => teacher.pass_rate).filter((value: any) => value != null)),
    ranked_teachers: ranked.length,
  };

  // A teacher sees their own row and the centre median. Naming every colleague
  // would turn an internal quality measure into a public league table.
  const isTeacher = user?.userType === 'teacher';
  const visibleTeachers = isTeacher
    ? teachers.filter((teacher: any) => teacher.teacher_id === Number(user?.id))
    : teachers;

  return {
    totals: {
      tests: Number(totals?.tests || 0),
      active: Number(totals?.active || 0),
      submissions: Number(totals?.submissions || 0),
      awaiting_grading: Number(totals?.awaiting_grading || 0),
      average_score: toNumberOrNull(totals?.average_score),
      pass_rate: toNumberOrNull(totals?.pass_rate),
    },
    by_type: byType.map((row: any) => ({ test_type: row.test_type, tests: Number(row.tests || 0) })),
    by_teacher: visibleTeachers,
    center_median: centerMedian,
    ranking: { metric: 'pass_rate', minimum_graded_submissions: RANKING_SUBMISSION_FLOOR },
    scope: isTeacher ? 'self' : 'center',
  };
};

module.exports = {
  listTests,
  canModifyTest,
  checkTestWriteAccess,
  getStatistics,
  rotateShareToken,
  revokeShareToken,
  getSharedTestView,
  startSharedTest,
  getSharedSubmission,
  submitSharedTest,
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
  autoGradeSubmission,
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
