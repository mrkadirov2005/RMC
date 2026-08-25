export {};

const express = require('express');
const router = express.Router();
const salaryController = require('../modules/salaries');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { MarkSalaryPaidDto, UpdateSalaryDto } = require('../dtos/salaries.dto');

router.get('/', requireAuth, requireRole('superuser'), salaryController.getOverview);
router.get('/teacher/:teacherId', requireAuth, requireRole('superuser'), salaryController.getTeacherDetail);
router.post('/mark-paid', requireAuth, requireRole('superuser'), validateBody(MarkSalaryPaidDto), salaryController.markPaid);
router.patch('/:id', requireAuth, requireRole('superuser'), validateBody(UpdateSalaryDto), salaryController.updatePatch);

module.exports = router;
export {};
