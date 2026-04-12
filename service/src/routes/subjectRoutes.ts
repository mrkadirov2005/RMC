export {};

const express_subject = require('express');
const router_subject = express_subject.Router();
const subjectController = require('../controllers/subjectController');
const { requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * /subjects:
 *   get:
 *     summary: Get all subjects
 *     tags: [Subjects]
 *     responses:
 *       200:
 *         description: List of all subjects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
 */
router_subject.get('/', requireAuth, subjectController.getAllSubjects);

/**
 * @swagger
 * /subjects/{id}:
 *   get:
 *     summary: Get subject by ID
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subject details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subject'
 *       404:
 *         description: Subject not found
 */
router_subject.get('/:id', requireAuth, subjectController.getSubjectById);

/**
 * @swagger
 * /subjects/class/{classId}:
 *   get:
 *     summary: Get subjects by class ID
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of subjects for class
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
 *       404:
 *         description: Class not found
 */
router_subject.get('/class/:classId', requireAuth, subjectController.getSubjectsByClass);

/**
 * @swagger
 * /subjects:
 *   post:
 *     summary: Create new subject
 *     tags: [Subjects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       201:
 *         description: Subject created successfully
 *       400:
 *         description: Invalid input
 */
router_subject.post('/', requireAuth, subjectController.createSubject);

/**
 * @swagger
 * /subjects/{id}:
 *   put:
 *     summary: Update subject
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subject'
 *     responses:
 *       200:
 *         description: Subject updated successfully
 *       404:
 *         description: Subject not found
 */
router_subject.put('/:id', requireAuth, subjectController.updateSubject);

/**
 * @swagger
 * /subjects/{id}:
 *   delete:
 *     summary: Delete subject
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subject deleted successfully
 *       404:
 *         description: Subject not found
 */
router_subject.delete('/:id', requireAuth, subjectController.deleteSubject);

module.exports = router_subject;
