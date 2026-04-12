export {};

const express_class = require('express');
const router_class = express_class.Router();
const classController = require('../controllers/classController');
const { requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * /classes:
 *   get:
 *     summary: Get all classes
 *     tags: [Classes]
 *     responses:
 *       200:
 *         description: List of all classes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Class'
 */
router_class.get('/', requireAuth, classController.getAllClasses);

/**
 * @swagger
 * /classes/{id}:
 *   get:
 *     summary: Get class by ID
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Class details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Class'
 *       404:
 *         description: Class not found
 */
router_class.get('/:id', requireAuth, classController.getClassById);

/**
 * @swagger
 * /classes:
 *   post:
 *     summary: Create new class
 *     tags: [Classes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Invalid input
 */
router_class.post('/', requireAuth, classController.createClass);

/**
 * @swagger
 * /classes/{id}:
 *   put:
 *     summary: Update class
 *     tags: [Classes]
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
 *             $ref: '#/components/schemas/Class'
 *     responses:
 *       200:
 *         description: Class updated successfully
 *       404:
 *         description: Class not found
 */
router_class.put('/:id', requireAuth, classController.updateClass);

/**
 * @swagger
 * /classes/{id}:
 *   delete:
 *     summary: Delete class
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Class deleted successfully
 *       404:
 *         description: Class not found
 */
router_class.delete('/:id', requireAuth, classController.deleteClass);

module.exports = router_class;