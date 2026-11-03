const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireDeveloper } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { TableParamDto, CreateTableRowDto, UpdateTableRowDto, DeleteTableRowDto } = require('../dtos/request.dto');

// Baseline guard: any route added below without an explicit role check is still
// authenticated by default rather than accidentally public.
router.use(requireAuth);
// The technical section (server, database, backups, resets) is the developer account's alone.
router.use(requireDeveloper);

router.get('/stats', systemController.getStats);
router.get('/metrics/history', systemController.getMetricsHistory);
router.get('/metrics/traffic', systemController.getTrafficStats);
router.get('/database/tables', systemController.getDatabaseTables);
router.get('/database/tables/:table/rows', validateParams(TableParamDto), systemController.getDatabaseTableRows);
router.post('/database/tables/:table/rows', validateParams(TableParamDto), validateBody(CreateTableRowDto), systemController.createDatabaseTableRow);
router.patch('/database/tables/:table/rows', validateParams(TableParamDto), validateBody(UpdateTableRowDto), systemController.updateDatabaseTableRow);
router.delete('/database/tables/:table/rows', validateParams(TableParamDto), validateBody(DeleteTableRowDto), systemController.deleteDatabaseTableRow);
router.post('/redeploy', systemController.redeployServer);
router.post('/backup', systemController.triggerBackup);
router.get('/backup/stats', systemController.getBackupStats);
router.post('/dev/reset-students', systemController.resetStudents);
router.post('/dev/reset-teachers', systemController.resetTeachers);
router.post('/dev/reset-classes', systemController.resetClasses);
router.post('/dev/reset-payments', systemController.resetPayments);

module.exports = router;

export {};
