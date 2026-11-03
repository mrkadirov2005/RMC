export {};

const express = require('express');
const router = express.Router();
const salaryController = require('../modules/salaries');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { MarkSalaryPaidDto, UpdateSalaryDto, AddSalaryAdvanceDto } = require('../dtos/salaries.dto');

router.get('/', requireAuth, requireRole('superuser'), salaryController.getOverview);
router.get('/monthly-summary', requireAuth, requireRole('superuser'), salaryController.getMonthlySummary);
router.get('/me', requireAuth, requireRole('teacher'), salaryController.getMyDetail);
router.get('/me/payments', requireAuth, requireRole('teacher'), salaryController.getMyGroupPayments);
router.get('/teacher/:teacherId', requireAuth, requireRole('superuser'), salaryController.getTeacherDetail);
router.get('/teacher/:teacherId/payments', requireAuth, requireRole('superuser'), salaryController.getTeacherGroupPayments);
router.post('/advances', requireAuth, requireRole('superuser'), validateBody(AddSalaryAdvanceDto), salaryController.addAdvance);
router.delete('/advances/:id', requireAuth, requireRole('superuser'), salaryController.removeAdvance);
router.post('/mark-paid', requireAuth, requireRole('superuser'), validateBody(MarkSalaryPaidDto), salaryController.markPaid);
router.patch('/:id', requireAuth, requireRole('superuser'), validateBody(UpdateSalaryDto), salaryController.updatePatch);

module.exports = router;
export {};
