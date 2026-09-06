export {};

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { AssignParentStudentDto, CreateParentDto, UpdateParentDto, IdParamDto } = require('../dtos/request.dto');
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
router.post('/', requireRole('superuser'), validateBody(CreateParentDto), parentController.createParent);
router.post('/assign-student', requireRole('superuser'), validateBody(AssignParentStudentDto), parentController.assignStudent);
router.get('/:id', requireRole('superuser'), validateParams(IdParamDto), parentController.getParentById);
router.put('/:id', requireRole('superuser'), validateParams(IdParamDto), validateBody(UpdateParentDto), parentController.updateParent);
router.delete('/:id', requireRole('superuser'), validateParams(IdParamDto), parentController.deleteParent);

module.exports = router;
export {};
