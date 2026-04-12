export {};

const express = require('express');
const router = express.Router();
const assignmentController = require('../modules/assignments');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, assignmentController.getAllAssignments);
router.get('/:id', requireAuth, assignmentController.getAssignmentById);
router.post('/', requireAuth, assignmentController.createAssignment);
router.put('/:id', requireAuth, assignmentController.updateAssignment);
router.delete('/:id', requireAuth, assignmentController.deleteAssignment);

module.exports = router;
export {};
