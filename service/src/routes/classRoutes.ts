export {};

const express_class = require('express');
const router_class = express_class.Router();
const { requireAuth, requireMuzaffarHardDelete } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery } = require('../middleware/validation');
const {
  ClassSessionParamDto,
  CreateClassDto,
  CreateClassSessionDto,
  DeleteUpcomingSessionsDto,
  ForceQueryDto,
  GenerateClassSessionsDto,
  IdParamDto,
  UpdateClassDto,
} = require('../dtos/request.dto');
const classController=require('../modules/classes/controllers/class.controller');
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

router_class.get('/sessions/bulk', requireAuth, classController.getBulkClassSessions);

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
router_class.get('/:id', requireAuth, validateParams(IdParamDto), classController.getClassById);

/**
 * @swagger
 * /classes/{id}/sessions:
 *   get:
 *     summary: Get sessions for a class
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of sessions for the class
 */
router_class.get('/:id/sessions', requireAuth, validateParams(IdParamDto), classController.getClassSessions);

/**
 * @swagger
 * /classes/{id}/sessions:
 *   post:
 *     summary: Create single session
 *     tags: [Classes]
 */
router_class.post('/:id/sessions', requireAuth, validateParams(IdParamDto), validateBody(CreateClassSessionDto), classController.createClassSession);


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
router_class.post('/', requireAuth, validateBody(CreateClassDto), classController.createClass);

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
router_class.put('/:id', requireAuth, validateParams(IdParamDto), validateBody(UpdateClassDto), classController.updateClass);

/**
 * @swagger
 * /classes/{id}/sessions/generate:
 *   post:
 *     summary: Generate monthly sessions for a class
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
 *             type: object
 *             properties:
 *               center_id:
 *                 type: integer
 *               month:
 *                 type: integer
 *               year:
 *                 type: integer
 *               duration_minutes:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Sessions generated
 */
router_class.post('/:id/sessions/generate', requireAuth, validateParams(IdParamDto), validateBody(GenerateClassSessionsDto), classController.generateClassSessions);

/**
 * @swagger
 * /classes/{id}/sessions:
 *   delete:
 *     summary: Delete upcoming sessions for a class
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           example: 2026-04-15
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           example: 2026-04-30
 *     responses:
 *       200:
 *         description: Sessions deleted
 */
router_class.delete('/:id/sessions', requireAuth, validateParams(IdParamDto), validateQuery(DeleteUpcomingSessionsDto), classController.deleteUpcomingClassSessions);

/**
 * @swagger
 * /classes/{id}/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a single session
 *     tags: [Classes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Session deleted
 */
router_class.delete('/:id/sessions/:sessionId', requireAuth, validateParams(ClassSessionParamDto), classController.deleteClassSessionById);
router_class.delete('/:id/sessions/:sessionId/purge', requireAuth, requireMuzaffarHardDelete, validateParams(ClassSessionParamDto), classController.purgeClassSessionById);

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
 *       - in: query
 *         name: force
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Delete attendance records before deleting the class
 *     responses:
 *       200:
 *         description: Class deleted successfully
 *       404:
 *         description: Class not found
 *       409:
 *         description: Class has attendance records
 */
router_class.delete('/:id', requireAuth, validateParams(IdParamDto), validateQuery(ForceQueryDto), classController.deleteClass);
router_class.delete('/:id/purge', requireAuth, requireMuzaffarHardDelete, validateParams(IdParamDto), classController.purgeClass);

module.exports = router_class;
