const { logAudit } = require('../../../utils/audit');
const testService = require('../services/test.service');
const { requireTestCenterScope } = require('./testScope');
const { studentBelongsToTeacher, testInCenter } = require('../../../shared/tenantDb');

// Stops a teacher changing a test somebody else wrote. Answers the request itself
// and returns false when the write must not go ahead.
const guardTestWrite = async (
  req: any,
  res: any,
  target: { testId?: number; questionId?: number; passageId?: number },
  centerId: number | undefined
) => {
  const access = await testService.checkTestWriteAccess(target, centerId, req.user);
  if (access === 'not_found') {
    res.status(404).json({ error: target.testId != null ? 'Test not found' : 'Not found' });
    return false;
  }
  if (access === 'forbidden') {
    res.status(403).json({ error: 'Only the teacher who created this test can change it.' });
    return false;
  }
  return true;
};

const getAllTests = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const rows = await testService.listTests(req.query, centerId ?? undefined, req.user);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message || String(error) });
  }
};

const getStatistics = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    res.json(await testService.getStatistics(centerId ?? undefined, req.user));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test statistics', details: error.message || String(error) });
  }
};

const createShareLink = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const out = await testService.rotateShareToken(Number(req.params.id), centerId ?? undefined, req.user);
    if (!out) return res.status(404).json({ error: 'Test not found' });
    if (out.error === 'forbidden') {
      return res.status(403).json({ error: 'Only the test author or a superuser can share this test.' });
    }
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'SHARE',
      entity_type: 'test',
      entity_id: Number(req.params.id),
      center_id: centerId ?? undefined,
      details: { rotated: true },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Share link ready', share_token: out.share_token });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create share link', details: error.message || String(error) });
  }
};

const revokeShareLink = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const out = await testService.revokeShareToken(Number(req.params.id), centerId ?? undefined, req.user);
    if (!out) return res.status(404).json({ error: 'Test not found' });
    if (out.error === 'forbidden') {
      return res.status(403).json({ error: 'Only the test author or a superuser can revoke this link.' });
    }
    res.json({ message: 'Share link revoked' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to revoke share link', details: error.message || String(error) });
  }
};

const getSharedTest = async (req: any, res: any) => {
  try {
    const view = await testService.getSharedTestView(req.params.shareToken);
    if (!view) return res.status(404).json({ error: 'This link is no longer active.' });
    res.json(view);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to open this link', details: error.message || String(error) });
  }
};

const startSharedTest = async (req: any, res: any) => {
  try {
    const out = await testService.startSharedTest(req.params.shareToken, req.body?.username, {
      ipAddress: req.ip || null,
      confirm: Boolean(req.body?.confirm),
    });
    if (out.error === 'not_found') {
      return res.status(404).json({ error: 'This link is no longer active.' });
    }
    // One message for an unknown username and for a student who was never assigned
    // this test, so the link cannot be used to find out who studies here.
    if (out.error === 'not_assigned') {
      return res.status(403).json({ error: 'This test has not been assigned to that username.' });
    }
    if (out.error === 'already_submitted') {
      return res.status(409).json({ error: 'You have already completed this test.', attempts: out.attempts });
    }
    if (out.needs_confirmation) {
      return res.json({ needs_confirmation: true, attempts: out.attempts });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to start this test', details: error.message || String(error) });
  }
};

const getSharedSubmission = async (req: any, res: any) => {
  try {
    const out = await testService.getSharedSubmission(
      req.params.shareToken,
      Number(req.params.submissionId),
      String(req.query.access_token || '')
    );
    if (out.error === 'not_found') {
      return res.status(404).json({ error: 'This link is no longer active.' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to open this test', details: error.message || String(error) });
  }
};

const submitSharedTest = async (req: any, res: any) => {
  try {
    const { access_token: accessToken, ...body } = req.body || {};
    const out = await testService.submitSharedTest(
      req.params.shareToken,
      Number(req.params.submissionId),
      String(accessToken || ''),
      body
    );
    if (out.error === 'not_found') {
      return res.status(404).json({ error: 'This link is no longer active.' });
    }
    if (out.error === 'already_submitted') {
      return res.status(409).json({ error: 'This attempt has already been handed in.' });
    }
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Those answers do not belong to this test.' });
    }
    if (out.error === 'word_limit') {
      return res.status(400).json({ error: 'One answer is over its word limit.', question_id: out.question_id });
    }
    if (out.error === 'required') {
      return res.status(400).json({ error: 'Every required question needs an answer.', question_id: out.question_id });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to hand in this test', details: error.message || String(error) });
  }
};

const getTestById = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const data = await testService.getTestById(Number(req.params.id), centerId ?? undefined, req.user);
    if (!data) return res.status(404).json({ error: 'Test not found' });
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test', details: error.message || String(error) });
  }
};

const createTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const out = await testService.createTest({
      ...req.body,
      center_id: centerId ?? req.body.center_id,
      // The author is whoever is signed in. Trusting the body would let a teacher
      // create a test under a colleague's name and then edit it as them.
      created_by: req.user?.id ?? null,
      created_by_type: req.user?.userType ?? null,
    });
    const { test, questions, passages } = out as { test: any; questions?: any[]; passages?: any[] };
    await logAudit({
      user_type: req.user?.userType || 'system',
      user_id: req.user?.id || 0,
      action: 'CREATE',
      entity_type: 'test',
      entity_id: test.test_id,
      details: { test_name: test.test_name, test_type: test.test_type },
      ip_address: req.ip,
    });
    res.status(201).json({ message: 'Test created', test, questions, passages });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create test', details: error.message || String(error) });
  }
};

const updateTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { testId: Number(req.params.id) }, centerId ?? undefined))) return;
    const row = await testService.updateTest(Number(req.params.id), req.body, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.json({ message: 'Test updated', test: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update test', details: error.message || String(error) });
  }
};

const deleteTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { testId: Number(req.params.id) }, centerId ?? undefined))) return;
    const row = await testService.deleteTest(Number(req.params.id), centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.json({ message: 'Test deleted', test: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete test', details: error.message || String(error) });
  }
};

const addQuestion = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { testId: Number(req.params.testId) }, centerId ?? undefined))) return;
    const row = await testService.addQuestion(Number(req.params.testId), req.body, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.status(201).json({ message: 'Question added', question: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add question', details: error.message || String(error) });
  }
};

const updateQuestion = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { questionId: Number(req.params.questionId) }, centerId ?? undefined))) return;
    const row = await testService.updateQuestion(Number(req.params.questionId), req.body, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question updated', question: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update question', details: error.message || String(error) });
  }
};

const deleteQuestion = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { questionId: Number(req.params.questionId) }, centerId ?? undefined))) return;
    const row = await testService.deleteQuestion(Number(req.params.questionId), centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted', question: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete question', details: error.message || String(error) });
  }
};

const addPassage = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { testId: Number(req.params.testId) }, centerId ?? undefined))) return;
    const row = await testService.addPassage(Number(req.params.testId), req.body, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.status(201).json({ message: 'Passage added', passage: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to add passage', details: error.message || String(error) });
  }
};

const updatePassage = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { passageId: Number(req.params.passageId) }, centerId ?? undefined))) return;
    const row = await testService.updatePassage(Number(req.params.passageId), req.body, centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Passage not found' });
    res.json({ message: 'Passage updated', passage: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update passage', details: error.message || String(error) });
  }
};

const deletePassage = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (!(await guardTestWrite(req, res, { passageId: Number(req.params.passageId) }, centerId ?? undefined))) return;
    const row = await testService.deletePassage(Number(req.params.passageId), centerId ?? req.body.center_id);
    if (!row) return res.status(404).json({ error: 'Passage not found' });
    res.json({ message: 'Passage deleted', passage: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete passage', details: error.message || String(error) });
  }
};

const startTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
    const row = await testService.startTest(Number(req.params.testId), req.body, {
      ip: req.ip,
      studentId: req.user?.userType === 'student' ? req.user?.id : req.body.student_id,
    }, centerId ?? req.body.center_id, req.user);
    if (row?.error === 'validation') {
      return res.status(400).json({ error: 'student_id is required to start a test' });
    }
    if (row?.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student does not belong to this center.' });
    }
    if (row?.error === 'max_retakes') {
      return res.status(409).json({ error: 'No attempts remaining for this test.' });
    }
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.status(201).json({ message: 'Test started', submission: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to start test', details: error.message || String(error) });
  }
};

const submitTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const submission = await testService.getSubmissionDetails(Number(req.params.submissionId), centerId ?? req.body.center_id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (req.user?.userType === 'student') {
      if (Number(submission.student_id) !== Number(req.user?.id)) {
        return res.status(403).json({ error: 'Access denied.' });
      }
    } else if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(submission.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    } else if (req.user?.userType !== 'superuser') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await testService.submitTest(Number(req.params.submissionId), req.body, centerId ?? req.body.center_id);
    if (row?.error === 'invalid_center') {
      return res.status(400).json({ error: 'Submission contains records from another center.' });
    }
    if (row?.error === 'word_limit') {
      return res.status(400).json({ error: 'Answer exceeds the word limit.', question_id: row.question_id });
    }
    if (row?.error === 'required') {
      return res.status(400).json({ error: 'A required question has no answer.', question_id: row.question_id });
    }
    if (!row) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Test submitted', submission: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to submit test', details: error.message || String(error) });
  }
};

const gradeSubmission = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (req.user?.userType === 'teacher') {
      const submission = await testService.getSubmissionDetails(Number(req.params.submissionId), centerId ?? req.body.center_id);
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      const ok = await studentBelongsToTeacher(submission.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    // Who marked the paper comes from the session, not the request body: a client
    // should not be able to file a grade under somebody else's name.
    const row = await testService.gradeSubmission(
      Number(req.params.submissionId),
      { ...req.body, graded_by: req.user?.id ?? null, graded_by_type: req.user?.userType ?? null },
      centerId ?? req.body.center_id
    );
    if (row?.error === 'invalid_center') {
      return res.status(400).json({ error: 'Submission contains records from another center.' });
    }
    if (row?.error === 'invalid_question') {
      return res.status(400).json({ error: 'Grade refers to a question outside this submission.', question_id: row.question_id });
    }
    if (!row) return res.status(404).json({ error: 'Submission not found' });
    res.json({ message: 'Submission graded', submission: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to grade submission', details: error.message || String(error) });
  }
};

const getSubmissionsByTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
    const rows = await testService.getSubmissionsByTest(Number(req.params.testId), centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions', details: error.message || String(error) });
  }
};

const getSubmissionDetails = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const data = await testService.getSubmissionDetails(Number(req.params.submissionId), centerId ?? req.body.center_id);
    if (!data) return res.status(404).json({ error: 'Submission not found' });
    if (req.user?.userType === 'student' && Number(data.student_id) !== Number(req.user?.id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(data.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch submission', details: error.message || String(error) });
  }
};

const getSubmissionsByStudent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const rows = await testService.getSubmissionsByStudent(studentId, centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student submissions', details: error.message || String(error) });
  }
};

const getTestResults = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
    const rows = await testService.getTestResults(Number(req.params.testId), centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test results', details: error.message || String(error) });
  }
};

const getStudentResults = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    const rows = await testService.getStudentResults(studentId, centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student results', details: error.message || String(error) });
  }
};

const assignTest = async (req: any, res: any) => {
  try {
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
    const rows = await testService.assignTest(Number(req.params.testId), req.body, {
      userId: req.user?.id || 0,
    }, centerId ?? req.body.center_id);
    if (!rows) return res.status(404).json({ error: 'Test not found' });
    res.status(201).json({ message: 'Test assigned', assignments: rows });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to assign test', details: error.message || String(error) });
  }
};

const getAssignedTests = async (req: any, res: any) => {
  try {
    const { type, id } = req.params;
    if (req.user?.userType === 'student' && (type !== 'student' || Number(id) !== req.user?.id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher' && (type !== 'teacher' || Number(id) !== req.user?.id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const centerId = requireTestCenterScope(req, res);
    if (centerId == null) return;
    const rows = await testService.getAssignedTests(type, Number(id), centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned tests', details: error.message || String(error) });
  }
};

module.exports = {
  getAllTests,
  getStatistics,
  createShareLink,
  revokeShareLink,
  getSharedTest,
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
  gradeSubmission,
  getSubmissionsByTest,
  getSubmissionDetails,
  getSubmissionsByStudent,
  getTestResults,
  getStudentResults,
  assignTest,
  getAssignedTests,
};

export {};
