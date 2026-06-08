const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireOwner } = require('../middleware/auth');

router.post('/redeploy', requireAuth, requireOwner, systemController.redeployServer);
router.post('/dev/reset-students', requireAuth, requireOwner, systemController.resetStudents);
router.post('/dev/reset-teachers', requireAuth, requireOwner, systemController.resetTeachers);
router.post('/dev/reset-classes', requireAuth, requireOwner, systemController.resetClasses);

module.exports = router;

export {};
