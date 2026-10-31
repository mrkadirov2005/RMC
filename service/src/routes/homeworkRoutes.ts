export {};

const express = require('express');
const homework = require('../modules/homework/homework.controller');

// @MOB-052 @MOB-053 @MOB-056 Homework Bank, assigning and reviewing. Mounted at /api/homework behind
// requireAuth for admins, the owner and teachers; the service checks centers and own groups.
const router = express.Router();

router.get('/bank', homework.bank);
router.post('/bank/:kind', homework.createNode);
router.get('/lessons/:lessonId/tasks', homework.listTasks);
router.post('/tasks', homework.createTask);
router.put('/tasks/:id', homework.updateTask);
router.post('/tasks/:id/approve', homework.approveTask);
router.get('/assignments', homework.listAssignments);
router.post('/assignments', homework.createAssignment);
router.get('/assignments/:id', homework.assignmentDetail);
router.delete('/assignments/:id', homework.deleteAssignment);
router.get('/assignments/:id/submissions', homework.submissions);
router.post('/submissions/:id/review', homework.review);

module.exports = router;
