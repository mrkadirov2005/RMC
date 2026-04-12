export {};

const express = require('express');
const router = express.Router();
const reportController = require('../modules/reports');

router.get('/overview', reportController.getOverviewReport);
router.get('/payments', reportController.getPaymentsReport);
router.get('/attendance', reportController.getAttendanceReport);

module.exports = router;
export {};
