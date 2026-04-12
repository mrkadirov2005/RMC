export {};

const express_att = require('express');
const router_att = express_att.Router();
const attendanceController = require('../controllers/attendanceController');
const { requireAuth } = require('../middleware/auth');

/**
 * @swagger
 * /attendance:
 *   get:
 *     summary: Get all attendance records
 *     tags: [Attendance]
 *     responses:
 *       200:
 *         description: List of all attendance records
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Attendance'
 */
router_att.get('/', requireAuth, attendanceController.getAllAttendance);

/**
 * @swagger
 * /attendance/student/{studentId}:
 *   get:
 *     summary: Get attendance records by student ID
 */
router_att.get('/student/:studentId', requireAuth, attendanceController.getAttendanceByStudent);

/**
 * @swagger
 * /attendance/class/{classId}:
 *   get:
 *     summary: Get attendance records by class ID
 */
router_att.get('/class/:classId', requireAuth, attendanceController.getAttendanceByClass);

/**
 * @swagger
 * /attendance/{id}:
 *   get:
 *     summary: Get attendance record by ID
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance record details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Attendance'
 *       404:
 *         description: Attendance record not found
 */
router_att.get('/:id', requireAuth, attendanceController.getAttendanceById);

/**
 * @swagger
 * /attendance:
 *   post:
 *     summary: Create new attendance record
 *     tags: [Attendance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       201:
 *         description: Attendance record created successfully
 *       400:
 *         description: Invalid input
 */
router_att.post('/', requireAuth, attendanceController.createAttendance);

/**
 * @swagger
 * /attendance/{id}:
 *   put:
 *     summary: Update attendance record
 *     tags: [Attendance]
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
 *             $ref: '#/components/schemas/Attendance'
 *     responses:
 *       200:
 *         description: Attendance record updated successfully
 *       404:
 *         description: Attendance record not found
 */
router_att.put('/:id', requireAuth, attendanceController.updateAttendance);

/**
 * @swagger
 * /attendance/{id}:
 *   delete:
 *     summary: Delete attendance record
 *     tags: [Attendance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Attendance record deleted successfully
 *       404:
 *         description: Attendance record not found
 */
router_att.delete('/:id', requireAuth, attendanceController.deleteAttendance);

module.exports = router_att;