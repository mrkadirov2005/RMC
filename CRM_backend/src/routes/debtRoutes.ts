const express_debt = require('express');
const router_debt = express_debt.Router();
const debtController = require('../controllers/debtController');

/**
 * @swagger
 * /debts:
 *   get:
 *     summary: Get all debts
 *     tags: [Debts]
 *     responses:
 *       200:
 *         description: List of all debts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Debt'
 */
router_debt.get('/', debtController.getAllDebts);

/**
 * @swagger
 * /debts/{id}:
 *   get:
 *     summary: Get debt by ID
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Debt details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Debt'
 *       404:
 *         description: Debt not found
 */
router_debt.get('/:id', debtController.getDebtById);

/**
 * @swagger
 * /debts:
 *   post:
 *     summary: Create new debt
 *     tags: [Debts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Debt'
 *     responses:
 *       201:
 *         description: Debt created successfully
 *       400:
 *         description: Invalid input
 */
router_debt.post('/', debtController.createDebt);

/**
 * @swagger
 * /debts/{id}:
 *   put:
 *     summary: Update debt
 *     tags: [Debts]
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
 *             $ref: '#/components/schemas/Debt'
 *     responses:
 *       200:
 *         description: Debt updated successfully
 *       404:
 *         description: Debt not found
 */
router_debt.put('/:id', debtController.updateDebt);

/**
 * @swagger
 * /debts/student/{studentId}:
 *   get:
 *     summary: Get debts by student ID
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of debts for student
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Debt'
 *       404:
 *         description: Student not found
 */
router_debt.get('/student/:studentId', debtController.getDebtsByStudent);

/**
 * @swagger
 * /debts/{id}:
 *   delete:
 *     summary: Delete debt
 *     tags: [Debts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Debt deleted successfully
 *       404:
 *         description: Debt not found
 */
router_debt.delete('/:id', debtController.deleteDebt);

module.exports = router_debt;