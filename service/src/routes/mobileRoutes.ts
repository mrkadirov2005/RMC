export {};

const express = require('express');
const { requireMobileRole, requireActiveMobileSession } = require('../modules/mobile/mobileAccess');
const auth = require('../modules/mobile/controllers/mobileAuth.controller');
const learner = require('../modules/mobile/controllers/mobileLearner.controller');
const notifications = require('../modules/mobile/controllers/mobileNotification.controller');

// @MOB-020 Mobile app API, mounted at /api/mobile/v1. Sign-in, refresh and sign-out are public
// and registered in index.ts. index.ts mounts this router behind requireAuth; every route here
// also needs a student or parent token whose device session is still active.
const router = express.Router();
const signedIn = [requireActiveMobileSession];
const student = [...signedIn, requireMobileRole('student')];
const parent = [...signedIn, requireMobileRole('parent')];
const parentChild = [...parent, learner.requireLinkedChild];

/**
 * @swagger
 * /mobile/v1/me:
 *   get:
 *     summary: Signed-in student or parent profile (MOB-023)
 *     tags: [Mobile]
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', ...signedIn, requireMobileRole('student', 'parent'), auth.me);
router.get('/devices', ...signedIn, requireMobileRole('student', 'parent'), auth.listDevices);
// @MOB-040 Literal path before /devices/:sessionId so it is not read as a session id.
router.put('/devices/current/push-token', ...signedIn, requireMobileRole('student', 'parent'), notifications.savePushToken);
router.delete('/devices/:sessionId', ...signedIn, requireMobileRole('student', 'parent'), auth.revokeDevice);

// @MOB-043 Inbox and per-category preferences.
router.get('/notifications', ...signedIn, requireMobileRole('student', 'parent'), notifications.list);
router.post('/notifications/read', ...signedIn, requireMobileRole('student', 'parent'), notifications.markRead);
router.get('/notification-preferences', ...signedIn, requireMobileRole('student', 'parent'), notifications.getPreferences);
router.put('/notification-preferences', ...signedIn, requireMobileRole('student', 'parent'), notifications.setPreference);

// @MOB-031 The student's own data.
router.get('/student/dashboard', ...student, learner.dashboard);
router.get('/student/schedule', ...student, learner.schedule);
router.get('/student/attendance', ...student, learner.attendance);
router.get('/student/grades', ...student, learner.grades);
router.get('/student/coins', ...student, learner.coins);
router.get('/student/payments', ...student, learner.payments);
router.get('/student/leaderboard', ...student, learner.leaderboard);

// @MOB-026 @MOB-027 @MOB-028 @MOB-029 @MOB-030 A parent's linked children.
router.get('/parent/children', ...parent, learner.listChildren);
router.get('/parent/children/:studentId/dashboard', ...parentChild, learner.dashboard);
router.get('/parent/children/:studentId/schedule', ...parentChild, learner.schedule);
router.get('/parent/children/:studentId/attendance', ...parentChild, learner.attendance);
router.get('/parent/children/:studentId/grades', ...parentChild, learner.grades);
router.get('/parent/children/:studentId/coins', ...parentChild, learner.coins);
router.get('/parent/children/:studentId/payments', ...parentChild, learner.payments);

module.exports = router;
