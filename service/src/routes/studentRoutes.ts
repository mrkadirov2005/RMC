export {};

const express_student = require('express');
const router_student = express_student.Router();
const studentController = require('../controllers/studentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { CredentialsDto, PasswordChangeDto, SetPasswordDto, StudentCoinTransactionDto } = require('../dtos/request.dto');

/**
 * @swagger
 * /students:
 *   get:
 *     summary: Get all students
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: List of all students
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Student'
 */
router_student.get('/', requireAuth, studentController.getAllStudents);

/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found
 */
router_student.get('/:id', requireAuth, studentController.getStudentById);

/**
 * @swagger
 * /students:
 *   post:
 *     summary: Create a new student
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       201:
 *         description: Student created successfully
 */
router_student.post('/', requireAuth, studentController.createStudent);

/**
 * @swagger
 * /students/{id}:
 *   put:
 *     summary: Update student
 *     tags: [Students]
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
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       200:
 *         description: Student updated successfully
 */
router_student.put('/:id', requireAuth, studentController.updateStudent);

/**
 * @swagger
 * /students/{id}:
 *   delete:
 *     summary: Delete student
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Student deleted successfully
 *       404:
 *         description: Student not found
 */
router_student.delete('/:id', requireAuth, requireRole('superuser'), studentController.deleteStudent);

/**
 * @swagger
 * /students/auth/login:
 *   post:
 *     summary: Student login
 *     tags: [Students]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router_student.post('/auth/login', validateBody(CredentialsDto), studentController.studentLogin);

/**
 * @swagger
 * /students/{id}/set-password:
 *   post:
 *     summary: Set student password (admin operation)
 *     tags: [Students]
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
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password set successfully
 */
router_student.post('/:id/set-password', requireAuth, requireRole('superuser'), validateBody(SetPasswordDto), studentController.setStudentPassword);

/**
 * @swagger
 * /students/{id}/change-password:
 *   post:
 *     summary: Change student password
 *     tags: [Students]
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
 *             required:
 *               - old_password
 *               - new_password
 *             properties:
 *               old_password:
 *                 type: string
 *               new_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router_student.post('/:id/change-password', requireAuth, validateBody(PasswordChangeDto), studentController.changeStudentPassword);

/**
 * @swagger
 * /students/{id}/coins:
 *   get:
 *     summary: Get student coin balance and transactions
 *     tags: [Students]
 */
router_student.get('/:id/coins', requireAuth, studentController.getStudentCoins);

/**
 * @swagger
 * /students/{id}/coins:
 *   post:
 *     summary: Add or subtract student coins
 *     tags: [Students]
 */
router_student.post('/:id/coins', requireAuth, validateBody(StudentCoinTransactionDto), studentController.addStudentCoins);

/**
 * @swagger
 * /students/{id}/coins/{transactionId}:
 *   put:
 *     summary: Update a coin transaction
 *     tags: [Students]
 */
router_student.put('/:id/coins/:transactionId', requireAuth, validateBody(StudentCoinTransactionDto), studentController.updateStudentCoinTransaction);

/**
 * @swagger
 * /students/{id}/coins/{transactionId}:
 *   delete:
 *     summary: Delete a coin transaction
 *     tags: [Students]
 */
router_student.delete('/:id/coins/:transactionId', requireAuth, studentController.deleteStudentCoinTransaction);

module.exports = router_student;

export {};
