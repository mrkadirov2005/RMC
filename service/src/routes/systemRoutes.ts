const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireOwner, requireRole } = require('../middleware/auth');

// The viewer shell and noVNC client code contain no data. Access to the live
// framebuffer is separately protected by a short-lived, per-run token during
// the WebSocket upgrade.
router.get('/dev/e2e/viewer', systemController.getE2eViewer);
router.use('/dev/e2e/novnc', express.static(process.env.E2E_NOVNC_WEB_ROOT || '/usr/share/novnc', {
  fallthrough: false,
  immutable: true,
  maxAge: '1d',
}));

router.get('/stats', requireAuth, requireRole('superuser'), systemController.getStats);
router.get('/database/tables', requireAuth, requireOwner, systemController.getDatabaseTables);
router.get('/database/tables/:table/rows', requireAuth, requireOwner, systemController.getDatabaseTableRows);
router.post('/redeploy', requireAuth, requireOwner, systemController.redeployServer);
router.post('/dev/reset-students', requireAuth, requireOwner, systemController.resetStudents);
router.post('/dev/reset-teachers', requireAuth, requireOwner, systemController.resetTeachers);
router.post('/dev/reset-classes', requireAuth, requireOwner, systemController.resetClasses);
router.post('/dev/reset-payments', requireAuth, requireOwner, systemController.resetPayments);
router.get('/dev/e2e/flows', requireAuth, requireOwner, systemController.getE2eCatalog);
router.get('/dev/e2e/status', requireAuth, requireOwner, systemController.getE2eStatus);
router.post('/dev/e2e/runs', requireAuth, requireOwner, systemController.startE2eRun);
router.delete('/dev/e2e/runs/:runId', requireAuth, requireOwner, systemController.cancelE2eRun);

module.exports = router;

export {};
