export {};

const express = require('express');
const router = express.Router();
const consolidationController = require('../modules/consolidations/controllers/consolidation.controller');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  SaveConsolidationAnswerDto,
  ShareTokenParamDto,
  ShareTokenTrialParamDto,
  StartPublicTrialDto,
} = require('../dtos/request.dto');

router.get('/:shareToken', validateParams(ShareTokenParamDto), consolidationController.getPublicSetView);

router.post('/:shareToken/trials', validateParams(ShareTokenParamDto), validateBody(StartPublicTrialDto), consolidationController.startPublicTrial);

router.patch('/:shareToken/trials/:trialId/answer', validateParams(ShareTokenTrialParamDto), validateBody(SaveConsolidationAnswerDto), consolidationController.savePublicAnswer);

router.post('/:shareToken/trials/:trialId/submit', validateParams(ShareTokenTrialParamDto), consolidationController.submitPublicTrial);

router.post('/:shareToken/trials/:trialId/violation', validateParams(ShareTokenTrialParamDto), consolidationController.logPublicViolation);

module.exports = router;
