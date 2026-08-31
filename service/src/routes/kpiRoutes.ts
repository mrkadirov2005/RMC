export {};

const express = require('express');
const router = express.Router();
const kpiController = require('../modules/kpis');
const { requireAuth, requireRole, requireOwner } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { UpsertKpiDto } = require('../dtos/kpis.dto');

router.get('/', requireAuth, requireRole('superuser'), kpiController.getOverview);
router.get('/teacher/:teacherId', requireAuth, requireRole('superuser'), kpiController.getTeacherDetail);
router.post('/', requireAuth, requireOwner, validateBody(UpsertKpiDto), kpiController.upsert);

module.exports = router;
export {};
