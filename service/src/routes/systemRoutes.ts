const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireOwner, requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { TableParamDto, CreateTableRowDto, UpdateTableRowDto, DeleteTableRowDto } = require('../dtos/request.dto');

// Baseline guard: any route added below without an explicit role check is still
// authenticated by default rather than accidentally public.
router.use(requireAuth);

router.get('/stats', requireRole('superuser'), systemController.getStats);
router.get('/database/tables', requireOwner, systemController.getDatabaseTables);
router.get('/database/tables/:table/rows', requireOwner, validateParams(TableParamDto), systemController.getDatabaseTableRows);
router.post('/database/tables/:table/rows', requireOwner, validateParams(TableParamDto), validateBody(CreateTableRowDto), systemController.createDatabaseTableRow);
router.patch('/database/tables/:table/rows', requireOwner, validateParams(TableParamDto), validateBody(UpdateTableRowDto), systemController.updateDatabaseTableRow);
router.delete('/database/tables/:table/rows', requireOwner, validateParams(TableParamDto), validateBody(DeleteTableRowDto), systemController.deleteDatabaseTableRow);
router.post('/redeploy', requireOwner, systemController.redeployServer);
router.post('/dev/reset-students', requireOwner, systemController.resetStudents);
router.post('/dev/reset-teachers', requireOwner, systemController.resetTeachers);
router.post('/dev/reset-classes', requireOwner, systemController.resetClasses);
router.post('/dev/reset-payments', requireOwner, systemController.resetPayments);

module.exports = router;

export {};
