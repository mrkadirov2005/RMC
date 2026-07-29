const { and, desc, eq, inArray, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const {
  readingPassages,
  students,
  testAnswers,
  testAssignments,
  testQuestions,
  testResultsSummary,
  testSubmissions,
  tests,
} = require('../../../db/schema');

const db = pool.db;

const normalizeJson = (val: any, fallback: any = null) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

const testSelection = {
  test_id: tests.testId,
  center_id: tests.centerId,
  subject_id: tests.subjectId,
  test_name: tests.testName,
  test_type: tests.testType,
  description: tests.description,
  instructions: tests.instructions,
  total_marks: tests.totalMarks,
  passing_marks: tests.passingMarks,
  duration_minutes: tests.durationMinutes,
  assignment_type: tests.assignmentType,
  is_timed: tests.isTimed,
  shuffle_questions: tests.shuffleQuestions,
  show_results_immediately: tests.showResultsImmediately,
  allow_retake: tests.allowRetake,
  max_retakes: tests.maxRetakes,
  test_data: tests.testData,
  created_by: tests.createdBy,
  created_by_type: tests.createdByType,
  is_active: tests.isActive,
  is_private: tests.isPrivate,
  start_date: tests.startDate,
  end_date: tests.endDate,
  created_at: tests.createdAt,
  updated_at: tests.updatedAt,
};

const questionSelection = {
  question_id: testQuestions.questionId,
  center_id: testQuestions.centerId,
  test_id: testQuestions.testId,
  passage_id: testQuestions.passageId,
  question_text: testQuestions.questionText,
  question_type: testQuestions.questionType,
  marks: testQuestions.marks,
  negative_marks: testQuestions.negativeMarks,
  question_order: testQuestions.questionOrder,
  options: testQuestions.options,
  correct_answer: testQuestions.correctAnswer,
  explanation: testQuestions.explanation,
  image_url: testQuestions.imageUrl,
  is_required: testQuestions.isRequired,
  word_limit: testQuestions.wordLimit,
  created_at: testQuestions.createdAt,
};

const passageSelection = {
  passage_id: readingPassages.passageId,
  center_id: readingPassages.centerId,
  test_id: readingPassages.testId,
  title: readingPassages.title,
  content: readingPassages.content,
  word_count: readingPassages.wordCount,
  difficulty_level: readingPassages.difficultyLevel,
  passage_order: readingPassages.passageOrder,
  audio_url: readingPassages.audioUrl,
  image_url: readingPassages.imageUrl,
  created_at: readingPassages.createdAt,
};

const submissionSelection = {
  submission_id: testSubmissions.submissionId,
  center_id: testSubmissions.centerId,
  test_id: testSubmissions.testId,
  student_id: testSubmissions.studentId,
  started_at: testSubmissions.startedAt,
  submitted_at: testSubmissions.submittedAt,
  time_taken_seconds: testSubmissions.timeTakenSeconds,
  submission_data: testSubmissions.submissionData,
  total_score: testSubmissions.totalScore,
  obtained_marks: testSubmissions.obtainedMarks,
  percentage: testSubmissions.percentage,
  status: testSubmissions.status,
  is_passed: testSubmissions.isPassed,
  feedback: testSubmissions.feedback,
  graded_by: testSubmissions.gradedBy,
  graded_by_type: testSubmissions.gradedByType,
  graded_at: testSubmissions.gradedAt,
  attempt_number: testSubmissions.attemptNumber,
  ip_address: testSubmissions.ipAddress,
  created_at: testSubmissions.createdAt,
  updated_at: testSubmissions.updatedAt,
};

const answerSelection = {
  answer_id: testAnswers.answerId,
  center_id: testAnswers.centerId,
  submission_id: testAnswers.submissionId,
  question_id: testAnswers.questionId,
  student_answer: testAnswers.studentAnswer,
  is_correct: testAnswers.isCorrect,
  marks_obtained: testAnswers.marksObtained,
  feedback: testAnswers.feedback,
  graded: testAnswers.graded,
  graded_at: testAnswers.gradedAt,
};

const resultSelection = {
  result_id: testResultsSummary.resultId,
  center_id: testResultsSummary.centerId,
  test_id: testResultsSummary.testId,
  student_id: testResultsSummary.studentId,
  best_score: testResultsSummary.bestScore,
  average_score: testResultsSummary.averageScore,
  total_attempts: testResultsSummary.totalAttempts,
  last_attempt_at: testResultsSummary.lastAttemptAt,
  first_passed_at: testResultsSummary.firstPassedAt,
  is_completed: testResultsSummary.isCompleted,
  certificate_issued: testResultsSummary.certificateIssued,
  created_at: testResultsSummary.createdAt,
  updated_at: testResultsSummary.updatedAt,
};

const assignmentSelection = {
  assignment_id: testAssignments.assignmentId,
  center_id: testAssignments.centerId,
  test_id: testAssignments.testId,
  assigned_to_type: testAssignments.assignedToType,
  assigned_to_id: testAssignments.assignedToId,
  assigned_by: testAssignments.assignedBy,
  assigned_at: testAssignments.assignedAt,
  due_date: testAssignments.dueDate,
  is_mandatory: testAssignments.isMandatory,
  notes: testAssignments.notes,
};

const findAll = async (filters: Record<string, any> = {}) => {
  const conditions: any[] = [];
  if (filters.center_id) conditions.push(eq(tests.centerId, Number(filters.center_id)));
  if (filters.subject_id) conditions.push(eq(tests.subjectId, Number(filters.subject_id)));
  if (filters.test_type) conditions.push(eq(tests.testType, filters.test_type));
  if (filters.is_active !== undefined) conditions.push(eq(tests.isActive, filters.is_active));
  if (filters.visible_to_creator_id) {
    conditions.push(sql`(COALESCE(${tests.isPrivate}, false) = false OR ${tests.createdBy} = ${Number(filters.visible_to_creator_id)})`);
  }
  if (filters.public_only) conditions.push(sql`COALESCE(${tests.isPrivate}, false) = false`);
  const query = db.select(testSelection).from(tests);
  return (conditions.length ? query.where(and(...conditions)) : query).orderBy(desc(tests.createdAt));
};

const findById = async (id: number, centerId?: number) => {
  const conditions = [eq(tests.testId, Number(id))];
  if (centerId) conditions.push(eq(tests.centerId, Number(centerId)));
  const rows = await db.select(testSelection).from(tests).where(and(...conditions));
  return rows[0] || null;
};

const insertTest = async (params: any[], runner: any = db) => {
  const rows = await runner
    .insert(tests)
    .values({
      centerId: Number(params[0]),
      subjectId: params[1] == null ? null : Number(params[1]),
      testName: params[2],
      testType: params[3],
      description: params[4],
      instructions: params[5],
      totalMarks: params[6] == null ? null : Number(params[6]),
      passingMarks: params[7] == null ? null : Number(params[7]),
      durationMinutes: params[8] == null ? null : Number(params[8]),
      assignmentType: params[9],
      isTimed: params[10],
      shuffleQuestions: params[11],
      showResultsImmediately: params[12],
      allowRetake: params[13],
      maxRetakes: params[14] == null ? null : Number(params[14]),
      testData: normalizeJson(params[15], {}),
      createdBy: params[16] == null ? null : Number(params[16]),
      createdByType: params[17],
      isActive: params[18],
      isPrivate: params[19],
      startDate: params[20],
      endDate: params[21],
    })
    .returning(testSelection);
  return rows[0];
};

const updateTest = async (params: any[], id: number, centerId?: number) => {
  const setData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  const keys = [
    'subjectId',
    'testName',
    'testType',
    'description',
    'instructions',
    'totalMarks',
    'passingMarks',
    'durationMinutes',
    'assignmentType',
    'isTimed',
    'shuffleQuestions',
    'showResultsImmediately',
    'allowRetake',
    'maxRetakes',
    'testData',
    'isActive',
    'isPrivate',
    'startDate',
    'endDate',
  ];
  keys.forEach((key, idx) => {
    if (params[idx] !== undefined && params[idx] !== null) setData[key] = key === 'testData' ? normalizeJson(params[idx], {}) : params[idx];
  });
  const conditions = [eq(tests.testId, Number(id))];
  if (centerId) conditions.push(eq(tests.centerId, Number(centerId)));
  const rows = await db.update(tests).set(setData).where(and(...conditions)).returning(testSelection);
  return rows[0] || null;
};

const deleteTest = async (id: number, centerId?: number) => {
  const conditions = [eq(tests.testId, Number(id))];
  if (centerId) conditions.push(eq(tests.centerId, Number(centerId)));
  const rows = await db.delete(tests).where(and(...conditions)).returning(testSelection);
  return rows[0] || null;
};

const findQuestionsByTest = async (testId: number, centerId?: number) => {
  const conditions = [eq(testQuestions.testId, Number(testId))];
  if (centerId) conditions.push(eq(testQuestions.centerId, Number(centerId)));
  return db.select(questionSelection).from(testQuestions).where(and(...conditions)).orderBy(testQuestions.questionOrder, testQuestions.questionId);
};

const findPassagesByTest = async (testId: number, centerId?: number) => {
  const conditions = [eq(readingPassages.testId, Number(testId))];
  if (centerId) conditions.push(eq(readingPassages.centerId, Number(centerId)));
  return db.select(passageSelection).from(readingPassages).where(and(...conditions)).orderBy(readingPassages.passageOrder, readingPassages.passageId);
};

const insertQuestion = async (params: any[], runner: any = db) => {
  const rows = await runner
    .insert(testQuestions)
    .values({
      centerId: Number(params[0]),
      testId: Number(params[1]),
      passageId: params[2] == null ? null : Number(params[2]),
      questionText: params[3],
      questionType: params[4],
      marks: params[5] == null ? null : Number(params[5]),
      negativeMarks: params[6] == null ? null : Number(params[6]),
      questionOrder: params[7] == null ? null : Number(params[7]),
      options: normalizeJson(params[8]),
      correctAnswer: normalizeJson(params[9]),
      explanation: params[10],
      imageUrl: params[11],
      isRequired: params[12],
      wordLimit: params[13] == null ? null : Number(params[13]),
    })
    .returning(questionSelection);
  return rows[0];
};

const updateQuestion = async (params: any[], questionId: number, centerId?: number) => {
  const keys = ['testId', 'passageId', 'questionText', 'questionType', 'marks', 'negativeMarks', 'questionOrder', 'options', 'correctAnswer', 'explanation', 'imageUrl', 'isRequired', 'wordLimit'];
  const setData: any = {};
  keys.forEach((key, idx) => {
    if (params[idx] !== undefined && params[idx] !== null) setData[key] = ['options', 'correctAnswer'].includes(key) ? normalizeJson(params[idx]) : params[idx];
  });
  const conditions = [eq(testQuestions.questionId, Number(questionId))];
  if (centerId) conditions.push(eq(testQuestions.centerId, Number(centerId)));
  const rows = await db.update(testQuestions).set(setData).where(and(...conditions)).returning(questionSelection);
  return rows[0] || null;
};

const deleteQuestion = async (id: number, centerId?: number) => {
  const conditions = [eq(testQuestions.questionId, Number(id))];
  if (centerId) conditions.push(eq(testQuestions.centerId, Number(centerId)));
  const rows = await db.delete(testQuestions).where(and(...conditions)).returning(questionSelection);
  return rows[0] || null;
};

const insertPassage = async (params: any[], runner: any = db) => {
  const rows = await runner
    .insert(readingPassages)
    .values({
      centerId: Number(params[0]),
      testId: Number(params[1]),
      title: params[2],
      content: params[3],
      wordCount: params[4] == null ? null : Number(params[4]),
      difficultyLevel: params[5],
      passageOrder: params[6] == null ? null : Number(params[6]),
      audioUrl: params[7],
      imageUrl: params[8],
    })
    .returning(passageSelection);
  return rows[0];
};

const updatePassage = async (params: any[], passageId: number, centerId?: number) => {
  const keys = ['testId', 'title', 'content', 'wordCount', 'difficultyLevel', 'passageOrder', 'audioUrl', 'imageUrl'];
  const setData: any = {};
  keys.forEach((key, idx) => {
    if (params[idx] !== undefined && params[idx] !== null) setData[key] = params[idx];
  });
  const conditions = [eq(readingPassages.passageId, Number(passageId))];
  if (centerId) conditions.push(eq(readingPassages.centerId, Number(centerId)));
  const rows = await db.update(readingPassages).set(setData).where(and(...conditions)).returning(passageSelection);
  return rows[0] || null;
};

const deletePassage = async (id: number, centerId?: number) => {
  const conditions = [eq(readingPassages.passageId, Number(id))];
  if (centerId) conditions.push(eq(readingPassages.centerId, Number(centerId)));
  const rows = await db.delete(readingPassages).where(and(...conditions)).returning(passageSelection);
  return rows[0] || null;
};

const findSubmissionById = async (id: number, centerId?: number) => {
  const conditions = [eq(testSubmissions.submissionId, Number(id))];
  if (centerId) conditions.push(eq(testSubmissions.centerId, Number(centerId)));
  const rows = await db.select(submissionSelection).from(testSubmissions).where(and(...conditions));
  return rows[0] || null;
};

const findSubmissionsByTest = async (testId: number, centerId?: number) => {
  const conditions = [eq(testSubmissions.testId, Number(testId))];
  if (centerId) conditions.push(eq(testSubmissions.centerId, Number(centerId)));
  return db.select(submissionSelection).from(testSubmissions).where(and(...conditions)).orderBy(desc(testSubmissions.createdAt));
};

const findSubmissionsByStudent = async (studentId: number, centerId?: number) => {
  const conditions = [eq(testSubmissions.studentId, Number(studentId))];
  if (centerId) conditions.push(eq(testSubmissions.centerId, Number(centerId)));
  return db.select(submissionSelection).from(testSubmissions).where(and(...conditions)).orderBy(desc(testSubmissions.createdAt));
};

const insertSubmission = async (params: any[]) => {
  const rows = await db
    .insert(testSubmissions)
    .values({
      centerId: params[0],
      testId: params[1],
      studentId: params[2],
      startedAt: params[3],
      submittedAt: params[4],
      timeTakenSeconds: params[5],
      submissionData: normalizeJson(params[6], {}),
      totalScore: params[7],
      obtainedMarks: params[8],
      percentage: params[9],
      status: params[10],
      isPassed: params[11],
      feedback: params[12],
      gradedBy: params[13],
      gradedByType: params[14],
      gradedAt: params[15],
      attemptNumber: params[16],
      ipAddress: params[17],
    })
    .returning(submissionSelection);
  return rows[0];
};

const updateSubmission = async (params: any[], submissionId: number, centerId?: number) => {
  const keys = ['submittedAt', 'timeTakenSeconds', 'submissionData', 'totalScore', 'obtainedMarks', 'percentage', 'status', 'isPassed', 'feedback', 'gradedBy', 'gradedByType', 'gradedAt', 'attemptNumber', 'ipAddress'];
  const setData: any = { updatedAt: sql`CURRENT_TIMESTAMP` };
  keys.forEach((key, idx) => {
    if (params[idx] !== undefined && params[idx] !== null) setData[key] = key === 'submissionData' ? normalizeJson(params[idx], {}) : params[idx];
  });
  const conditions = [eq(testSubmissions.submissionId, Number(submissionId))];
  if (centerId) conditions.push(eq(testSubmissions.centerId, Number(centerId)));
  const rows = await db.update(testSubmissions).set(setData).where(and(...conditions)).returning(submissionSelection);
  return rows[0] || null;
};

const findAnswersBySubmission = async (submissionId: number, centerId?: number) => {
  const conditions = [eq(testAnswers.submissionId, Number(submissionId))];
  if (centerId) conditions.push(eq(testAnswers.centerId, Number(centerId)));
  return db.select(answerSelection).from(testAnswers).where(and(...conditions)).orderBy(testAnswers.answerId);
};

const deleteAnswersBySubmission = async (submissionId: number, centerId?: number) => {
  const conditions = [eq(testAnswers.submissionId, Number(submissionId))];
  if (centerId) conditions.push(eq(testAnswers.centerId, Number(centerId)));
  await db.delete(testAnswers).where(and(...conditions));
};

const insertAnswer = async (params: any[]) => {
  const rows = await db
    .insert(testAnswers)
    .values({
      centerId: params[0],
      submissionId: params[1],
      questionId: params[2],
      studentAnswer: normalizeJson(params[3]),
      isCorrect: params[4],
      marksObtained: params[5],
      feedback: params[6],
      graded: params[7],
      gradedAt: params[8],
    })
    .returning(answerSelection);
  return rows[0];
};

const findResultsByTest = async (testId: number, centerId?: number) => {
  const conditions = [eq(testResultsSummary.testId, Number(testId))];
  if (centerId) conditions.push(eq(testResultsSummary.centerId, Number(centerId)));
  return db
    .select(resultSelection)
    .from(testResultsSummary)
    .where(and(...conditions))
    .orderBy(desc(testResultsSummary.bestScore), desc(testResultsSummary.averageScore));
};

const findResultsByStudent = async (studentId: number, centerId?: number) => {
  const conditions = [eq(testResultsSummary.studentId, Number(studentId))];
  if (centerId) conditions.push(eq(testResultsSummary.centerId, Number(centerId)));
  return db
    .select({
      ...resultSelection,
      test_name: tests.testName,
      test_type: tests.testType,
      total_marks: tests.totalMarks,
      passing_marks: tests.passingMarks,
    })
    .from(testResultsSummary)
    .innerJoin(tests, eq(tests.testId, testResultsSummary.testId))
    .where(and(...conditions))
    .orderBy(desc(testResultsSummary.updatedAt), desc(testResultsSummary.createdAt));
};

const findResultByStudent = async (testId: number, studentId: number, centerId?: number) => {
  const conditions = [eq(testResultsSummary.testId, Number(testId)), eq(testResultsSummary.studentId, Number(studentId))];
  if (centerId) conditions.push(eq(testResultsSummary.centerId, Number(centerId)));
  const rows = await db.select(resultSelection).from(testResultsSummary).where(and(...conditions));
  return rows[0] || null;
};

const upsertResult = async (params: any[]) => {
  const existing = await findResultByStudent(params[1], params[2], params[0]);
  const values = {
    centerId: params[0],
    testId: params[1],
    studentId: params[2],
    bestScore: params[3],
    averageScore: params[4],
    totalAttempts: params[5],
    lastAttemptAt: params[6],
    firstPassedAt: params[7],
    isCompleted: params[8],
    certificateIssued: params[9],
  };
  if (existing) {
    const rows = await db
      .update(testResultsSummary)
      .set({
        bestScore: values.bestScore,
        averageScore: values.averageScore,
        totalAttempts: values.totalAttempts,
        lastAttemptAt: values.lastAttemptAt,
        firstPassedAt: existing.first_passed_at || values.firstPassedAt,
        isCompleted: values.isCompleted,
        certificateIssued: values.certificateIssued,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(testResultsSummary.testId, values.testId), eq(testResultsSummary.studentId, values.studentId)))
      .returning(resultSelection);
    return rows[0];
  }
  const rows = await db.insert(testResultsSummary).values(values).returning(resultSelection);
  return rows[0];
};

const findAssignedTests = async (type: string, id: number, centerId?: number) => {
  if (type === 'student') {
    const conditions = [eq(tests.isActive, true)];
    if (centerId) conditions.push(eq(tests.centerId, Number(centerId)));
    return db
      .selectDistinct({
        ...testSelection,
        assigned_to_type: testAssignments.assignedToType,
        assigned_to_id: testAssignments.assignedToId,
        assigned_by: testAssignments.assignedBy,
        assigned_at: testAssignments.assignedAt,
        due_date: testAssignments.dueDate,
        is_mandatory: sql`COALESCE(${testAssignments.isMandatory}, ${tests.assignmentType} = 'all_students')`,
        notes: testAssignments.notes,
      })
      .from(tests)
      .leftJoin(testAssignments, eq(testAssignments.testId, tests.testId))
      .leftJoin(students, eq(students.studentId, Number(id)))
      .where(
        and(
          ...conditions,
          sql`(COALESCE(${tests.isPrivate}, false) = false OR (COALESCE(${tests.isPrivate}, false) = true AND ${tests.createdBy} = ${students.teacherId}))`
        )
      )
      .orderBy(tests.testId, desc(testAssignments.assignedAt));
  }

  const conditions = [eq(testAssignments.assignedToType, type), eq(testAssignments.assignedToId, Number(id))];
  if (centerId) conditions.push(eq(testAssignments.centerId, Number(centerId)));
  return db
    .select({
      ...testSelection,
      assigned_to_type: testAssignments.assignedToType,
      assigned_to_id: testAssignments.assignedToId,
      assigned_by: testAssignments.assignedBy,
      assigned_at: testAssignments.assignedAt,
      due_date: testAssignments.dueDate,
      is_mandatory: testAssignments.isMandatory,
      notes: testAssignments.notes,
    })
    .from(tests)
    .innerJoin(testAssignments, eq(testAssignments.testId, tests.testId))
    .where(and(...conditions))
    .orderBy(desc(testAssignments.assignedAt));
};

const insertAssignment = async (params: any[]) => {
  const existing = await db
    .select({ assignment_id: testAssignments.assignmentId })
    .from(testAssignments)
    .where(and(eq(testAssignments.testId, params[1]), eq(testAssignments.assignedToType, params[2]), eq(testAssignments.assignedToId, params[3])))
    .limit(1);
  if (existing[0]) {
    const rows = await db
      .update(testAssignments)
      .set({
        centerId: params[0],
        assignedBy: params[4],
        dueDate: params[5],
        isMandatory: params[6],
        notes: params[7],
        assignedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(testAssignments.assignmentId, existing[0].assignment_id))
      .returning(assignmentSelection);
    return rows[0];
  }
  const rows = await db
    .insert(testAssignments)
    .values({
      centerId: params[0],
      testId: params[1],
      assignedToType: params[2],
      assignedToId: params[3],
      assignedBy: params[4],
      dueDate: params[5],
      isMandatory: params[6],
      notes: params[7],
    })
    .returning(assignmentSelection);
  return rows[0];
};

const deleteAssignmentsByTest = async (testId: number, centerId?: number) => {
  const conditions = [eq(testAssignments.testId, Number(testId))];
  if (centerId) conditions.push(eq(testAssignments.centerId, Number(centerId)));
  await db.delete(testAssignments).where(and(...conditions));
};

const getQuestionsByIds = async (questionIds: number[], centerId?: number) => {
  if (questionIds.length === 0) return [];
  const conditions = [inArray(testQuestions.questionId, questionIds.map(Number))];
  if (centerId) conditions.push(eq(testQuestions.centerId, Number(centerId)));
  return db.select(questionSelection).from(testQuestions).where(and(...conditions)).orderBy(testQuestions.questionOrder, testQuestions.questionId);
};

module.exports = {
  findAll,
  findById,
  insertTest,
  updateTest,
  deleteTest,
  findQuestionsByTest,
  findPassagesByTest,
  insertQuestion,
  updateQuestion,
  deleteQuestion,
  insertPassage,
  updatePassage,
  deletePassage,
  findSubmissionById,
  findSubmissionsByTest,
  findSubmissionsByStudent,
  insertSubmission,
  updateSubmission,
  findAnswersBySubmission,
  deleteAnswersBySubmission,
  insertAnswer,
  findResultsByTest,
  findResultsByStudent,
  findResultByStudent,
  upsertResult,
  findAssignedTests,
  insertAssignment,
  deleteAssignmentsByTest,
  getQuestionsByIds,
};

export {};
