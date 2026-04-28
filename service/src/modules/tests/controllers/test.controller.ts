const { logAudit } = require('../../../utils/audit');
const testService = require('../services/test.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher, testInCenter } = require('../../../shared/tenantDb');

const getAllTests = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const rows = await testService.listTests(req.query, centerId ?? undefined, req.user);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message || String(error) });
  }
};

const getTestById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const out = await testService.createTest({
      ...req.body,
      center_id: centerId ?? req.body.center_id,
      created_by: req.body.created_by ?? req.user?.id,
      created_by_type: req.body.created_by_type ?? req.user?.userType ?? 'superuser',
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (centerId) {
      const ok = await testInCenter(Number(req.params.id), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (centerId) {
      const ok = await testInCenter(Number(req.params.id), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (centerId) {
      const ok = await testInCenter(Number(req.params.testId), centerId);
      if (!ok) return res.status(404).json({ error: 'Test not found' });
    }
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    if (!row) return res.status(404).json({ error: 'Test not found' });
    res.status(201).json({ message: 'Test started', submission: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to start test', details: error.message || String(error) });
  }
};

const submitTest = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const row = await testService.submitTest(Number(req.params.submissionId), req.body, centerId ?? req.body.center_id);
    if (row?.error === 'invalid_center') {
      return res.status(400).json({ error: 'Submission contains records from another center.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const row = await testService.gradeSubmission(Number(req.params.submissionId), req.body, centerId ?? req.body.center_id);
    if (row?.error === 'invalid_center') {
      return res.status(400).json({ error: 'Submission contains records from another center.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const data = await testService.getSubmissionDetails(Number(req.params.submissionId), centerId ?? req.body.center_id);
    if (!data) return res.status(404).json({ error: 'Submission not found' });
    if (req.user?.userType === 'student' && data.submission.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(data.submission.student_id, req.user?.id);
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const rows = await testService.getSubmissionsByStudent(studentId, centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student submissions', details: error.message || String(error) });
  }
};

const getTestResults = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    const rows = await testService.getAssignedTests(type, Number(id), centerId ?? req.body.center_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assigned tests', details: error.message || String(error) });
  }
};

module.exports = {
  getAllTests,
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
