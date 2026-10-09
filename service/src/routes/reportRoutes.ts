export {};

const express = require('express');
const router = express.Router();
const reportController = require('../modules/reports');

router.get('/overview', reportController.getOverviewReport);
router.get('/payments', reportController.getPaymentsReport);
router.get('/attendance', reportController.getAttendanceReport);
router.get('/retention', reportController.getRetentionReport);
router.get('/student-trend', reportController.getStudentTrend);

module.exports = router;
export {};
