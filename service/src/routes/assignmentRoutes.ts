export {};

const express = require('express');
const router = express.Router();
const assignmentController = require('../modules/assignments');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { CreateAssignmentDto, IdParamDto, UpdateAssignmentDto } = require('../dtos/request.dto');

router.get('/', requireAuth, assignmentController.getAllAssignments);
router.get('/:id', requireAuth, validateParams(IdParamDto), assignmentController.getAssignmentById);
router.post('/', requireAuth, validateBody(CreateAssignmentDto), assignmentController.createAssignment);
router.put('/:id', requireAuth, validateParams(IdParamDto), validateBody(UpdateAssignmentDto), assignmentController.updateAssignment);
router.delete('/:id', requireAuth, validateParams(IdParamDto), assignmentController.deleteAssignment);

module.exports = router;
export {};
