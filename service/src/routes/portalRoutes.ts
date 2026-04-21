const express = require('express');
const router = express.Router();
const portalController = require('../modules/portal/controllers/portal.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

// All routes here are restricted to students
router.get('/dashboard', requireAuth, requireRole('student'), portalController.getDashboardData);
router.get('/attendance', requireAuth, requireRole('student'), portalController.getMyAttendance);
router.get('/grades', requireAuth, requireRole('student'), portalController.getMyGrades);
router.get('/tests', requireAuth, requireRole('student'), portalController.getMyTests);
router.get('/schedule', requireAuth, requireRole('student'), portalController.getMySchedule);

module.exports = router;


export {};

