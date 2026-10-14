export {};

const express = require('express');
const router = express.Router();
const absenceAlertController = require('../modules/absence_alerts/controllers/absenceAlert.controller');
const { requireRole } = require('../middleware/auth');

router.get('/', absenceAlertController.getAlerts);
router.post('/resolve', requireRole('superuser'), absenceAlertController.resolveAlert);

module.exports = router;
