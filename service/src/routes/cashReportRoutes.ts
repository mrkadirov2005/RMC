export {};

const express = require('express');
const router = express.Router();
const cashReportController = require('../modules/cash_report/controllers/cashReport.controller');

router.get('/daily', cashReportController.getDailyReport);
router.get('/expenses', cashReportController.getExpenses);
router.post('/expenses', cashReportController.createExpense);
router.delete('/expenses/:id', cashReportController.deleteExpense);

module.exports = router;
