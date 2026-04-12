const express1 = require('express');
const router1 = express1.Router();
const assignmentController = require('../controllers/assignment.controller');

/**
 * @swagger
 * /assignments:
 *   get:
 *     summary: Get all assignments
 *     tags: [Assignments]
 */
router1.get('/', assignmentController.getAllAssignments);

/**
 * @swagger
 * /assignments/{id}:
 *   get:
 *     summary: Get assignment by ID
 */
router1.get('/:id', assignmentController.getAssignmentById);

router1.post('/', assignmentController.createAssignment);

router1.put('/:id', assignmentController.updateAssignment);

router1.delete('/:id', assignmentController.deleteAssignment);

module.exports = router1;

export {};
