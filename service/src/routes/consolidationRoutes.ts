export {};

const express = require('express');
const router = express.Router();
const consolidationController = require('../modules/consolidations/controllers/consolidation.controller');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  CreateConsolidationSetDto,
  SaveConsolidationAnswerDto,
  SessionIdParamDto,
  SetIdParamDto,
  TrialIdParamDto,
} = require('../dtos/request.dto');

router.post('/', requireAuth, requireRole('superuser', 'teacher'), validateBody(CreateConsolidationSetDto), consolidationController.createSet);

router.get('/session/:sessionId', requireAuth, requireRole('superuser', 'teacher'), validateParams(SessionIdParamDto), consolidationController.getSetForTeacher);

router.get('/session/:sessionId/student-view', requireAuth, requireRole('student'), validateParams(SessionIdParamDto), consolidationController.getSetForStudentView);

router.get('/session/:sessionId/results', requireAuth, requireRole('superuser', 'teacher'), validateParams(SessionIdParamDto), consolidationController.getResultsDashboard);

router.get('/overview', requireAuth, requireRole('superuser'), consolidationController.getOverview);

router.get('/trials/:trialId', requireAuth, validateParams(TrialIdParamDto), consolidationController.getTrialDetail);

router.post('/:setId/trials', requireAuth, requireRole('student'), validateParams(SetIdParamDto), consolidationController.startTrial);

router.patch('/trials/:trialId/answer', requireAuth, requireRole('student'), validateParams(TrialIdParamDto), validateBody(SaveConsolidationAnswerDto), consolidationController.saveAnswer);

router.post('/trials/:trialId/submit', requireAuth, requireRole('student'), validateParams(TrialIdParamDto), consolidationController.submitTrial);

router.post('/trials/:trialId/violation', requireAuth, requireRole('student'), validateParams(TrialIdParamDto), consolidationController.logViolation);

router.delete('/:setId', requireAuth, requireRole('superuser', 'teacher'), validateParams(SetIdParamDto), consolidationController.deleteSet);

router.post('/:setId/regenerate-link', requireAuth, requireRole('superuser', 'teacher'), validateParams(SetIdParamDto), consolidationController.regenerateLink);

module.exports = router;
