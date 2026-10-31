export {};

const express = require('express');
const { requireMobileRole, requireActiveMobileSession } = require('../modules/mobile/mobileAccess');
const auth = require('../modules/mobile/controllers/mobileAuth.controller');
const learner = require('../modules/mobile/controllers/mobileLearner.controller');
const notifications = require('../modules/mobile/controllers/mobileNotification.controller');
const content = require('../modules/mobile/controllers/mobileContent.controller');
const homework = require('../modules/homework/homework.controller');

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

// @MOB-060 @MOB-061 @MOB-062 @MOB-063 School content and requests, for students and parents.
const anyMobileUser = [...signedIn, requireMobileRole('student', 'parent')];
router.get('/links', ...anyMobileUser, content.links);
router.get('/announcements', ...anyMobileUser, content.announcements);
router.get('/policies', ...anyMobileUser, content.policies);
router.post('/policies/:policyId/accept', ...anyMobileUser, content.acceptPolicy);
router.get('/help-requests', ...anyMobileUser, content.listHelpRequests);
router.post('/help-requests', ...anyMobileUser, content.createHelpRequest);

// @MOB-031 The student's own data.
router.get('/student/dashboard', ...student, learner.dashboard);
router.get('/student/schedule', ...student, learner.schedule);
router.get('/student/attendance', ...student, learner.attendance);
router.get('/student/grades', ...student, learner.grades);
router.get('/student/coins', ...student, learner.coins);
router.get('/student/payments', ...student, learner.payments);
router.get('/student/leaderboard', ...student, learner.leaderboard);
// @MOB-127 Home charts: attendance, scores and coins by month.
router.get('/student/progress', ...student, learner.progress);
// @MOB-054 Homework: list, open, autosave, submit.
router.get('/student/homework', ...student, homework.myHomework);
router.get('/student/homework/:assignmentId', ...student, homework.homeworkDetail);
router.put('/student/homework/:assignmentId/answers', ...student, homework.saveAnswers);
router.post('/student/homework/:assignmentId/submit', ...student, homework.submit);

// @MOB-026 @MOB-027 @MOB-028 @MOB-029 @MOB-030 A parent's linked children.
router.get('/parent/children', ...parent, learner.listChildren);
router.get('/parent/children/:studentId/dashboard', ...parentChild, learner.dashboard);
router.get('/parent/children/:studentId/schedule', ...parentChild, learner.schedule);
router.get('/parent/children/:studentId/attendance', ...parentChild, learner.attendance);
router.get('/parent/children/:studentId/grades', ...parentChild, learner.grades);
router.get('/parent/children/:studentId/coins', ...parentChild, learner.coins);
router.get('/parent/children/:studentId/payments', ...parentChild, learner.payments);
router.get('/parent/children/:studentId/progress', ...parentChild, learner.progress);
// @MOB-054 A parent follows the child's homework (read only).
router.get('/parent/children/:studentId/homework', ...parentChild, homework.myHomework);
router.get('/parent/children/:studentId/homework/:assignmentId', ...parentChild, homework.homeworkDetail);

module.exports = router;
