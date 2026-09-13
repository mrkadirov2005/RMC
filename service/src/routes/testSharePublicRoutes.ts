export {};

// Public, unauthenticated entry point for a test share link. Mounted in index.ts
// behind the same rate limiter that guards the consolidation share links, and
// deliberately narrow: a caller can read the test's cover details and start an
// attempt, nothing else. Grading, results and the question bank all stay behind
// the authenticated router.

const express_test_share = require('express');
const router_test_share = express_test_share.Router();
const testController = require('../modules/tests/controllers/test.controller');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  SharedSubmissionParamDto,
  StartSharedTestDto,
  SubmitSharedTestDto,
  TestShareTokenParamDto,
} = require('../dtos/request.dto');

router_test_share.get('/:shareToken', validateParams(TestShareTokenParamDto), testController.getSharedTest);
router_test_share.post(
  '/:shareToken/start',
  validateParams(TestShareTokenParamDto),
  validateBody(StartSharedTestDto),
  testController.startSharedTest
);

// Reopening and handing in an attempt are keyed by the secret minted when it
// started, so a forwarded link cannot reach somebody else's paper.
router_test_share.get(
  '/:shareToken/submissions/:submissionId',
  validateParams(SharedSubmissionParamDto),
  testController.getSharedSubmission
);
router_test_share.post(
  '/:shareToken/submissions/:submissionId/submit',
  validateParams(SharedSubmissionParamDto),
  validateBody(SubmitSharedTestDto),
  testController.submitSharedTest
);

module.exports = router_test_share;
