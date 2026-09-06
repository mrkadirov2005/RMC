const express = require('express');
const router = express.Router();
const portalController = require('../modules/portal/controllers/portal.controller');

// Auth + student role are already enforced where this router is mounted (see index.ts).
router.get('/dashboard', portalController.getDashboardData);
router.get('/attendance', portalController.getMyAttendance);
router.get('/grades', portalController.getMyGrades);
router.get('/tests', portalController.getMyTests);
router.get('/schedule', portalController.getMySchedule);

module.exports = router;


export {};

