export {};

const express = require('express');
const router = express.Router();
const teacherTaskController = require('../modules/teacherTasks');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', requireAuth, teacherTaskController.getAllTeacherTasks);
router.get('/:id', requireAuth, teacherTaskController.getTeacherTaskById);
router.post('/', requireAuth, requireRole('superuser'), teacherTaskController.createTeacherTask);
router.put('/:id', requireAuth, requireRole('superuser'), teacherTaskController.updateTeacherTask);
router.delete('/:id', requireAuth, requireRole('superuser'), teacherTaskController.deleteTeacherTask);

module.exports = router;
export {};
