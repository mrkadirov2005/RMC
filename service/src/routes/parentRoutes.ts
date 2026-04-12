export {};

const express = require('express');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const parentController = require('../modules/parents');

const meRouter = express.Router();
meRouter.get('/students', parentController.getMyStudents);
meRouter.get('/students/payments', parentController.getMyStudentPayments);
meRouter.get('/students/attendance', parentController.getMyStudentAttendance);
meRouter.get('/students/grades', parentController.getMyStudentGrades);
meRouter.get('/students/tests', parentController.getMyStudentTests);

router.use('/me', requireRole('parent'), meRouter);

router.get('/', requireRole('superuser'), parentController.getAllParents);
router.post('/', requireRole('superuser'), parentController.createParent);
router.post('/assign-student', requireRole('superuser'), parentController.assignStudent);
router.get('/:id', requireRole('superuser'), parentController.getParentById);
router.put('/:id', requireRole('superuser'), parentController.updateParent);
router.delete('/:id', requireRole('superuser'), parentController.deleteParent);

module.exports = router;
export {};
