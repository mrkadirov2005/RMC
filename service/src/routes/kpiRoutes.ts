export {};

const express = require('express');
const router = express.Router();
const kpiController = require('../modules/kpis');
const { requireAuth, requireOwner } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { UpsertKpiDto } = require('../dtos/kpis.dto');

// Teacher KPI is the owner's: admins do not see it.
router.get('/', requireAuth, requireOwner, kpiController.getOverview);
router.get('/teacher/:teacherId', requireAuth, requireOwner, kpiController.getTeacherDetail);
router.post('/', requireAuth, requireOwner, validateBody(UpsertKpiDto), kpiController.upsert);

module.exports = router;
export {};
