const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireOwner, requireRole } = require('../middleware/auth');

router.get('/stats', requireAuth, requireRole('superuser'), systemController.getStats);
router.post('/redeploy', requireAuth, requireOwner, systemController.redeployServer);
router.post('/dev/reset-students', requireAuth, requireOwner, systemController.resetStudents);
router.post('/dev/reset-teachers', requireAuth, requireOwner, systemController.resetTeachers);
router.post('/dev/reset-classes', requireAuth, requireOwner, systemController.resetClasses);
router.post('/dev/reset-payments', requireAuth, requireOwner, systemController.resetPayments);

module.exports = router;

export {};
