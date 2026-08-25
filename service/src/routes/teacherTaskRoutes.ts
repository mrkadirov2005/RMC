export {};

const express = require('express');
const router = express.Router();
const teacherTaskController = require('../modules/teacherTasks');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, requireRole('superuser', 'teacher'), teacherTaskController.getAllTeacherTasks);
router.get('/stats', requireAuth, requireRole('superuser', 'teacher'), teacherTaskController.getTeacherTaskStats);
router.get('/:id', requireAuth, requireRole('superuser', 'teacher'), teacherTaskController.getTeacherTaskById);
router.post('/', requireAuth, requireRole('superuser'), teacherTaskController.createTeacherTask);
router.put('/:id', requireAuth, requireRole('superuser'), teacherTaskController.updateTeacherTask);
router.patch('/:id/status', requireAuth, requireRole('superuser', 'teacher'), teacherTaskController.updateTeacherTaskStatus);
router.delete('/:id', requireAuth, requireRole('superuser'), teacherTaskController.deleteTeacherTask);

module.exports = router;
export {};
