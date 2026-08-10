const express = require('express');
const router = express.Router();
const settingsController = require('../modules/settings');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/lesson-scoring', requireAuth, requireRole('superuser', 'teacher'), settingsController.getLessonScoring);
router.put('/lesson-scoring', requireAuth, requireRole('superuser'), settingsController.saveLessonScoring);
router.get('/owner-palette', requireAuth, settingsController.getOwnerPalette);
router.put('/owner-palette', requireAuth, requireRole('superuser'), settingsController.saveOwnerPalette);
router.get('/visual-overrides', requireAuth, settingsController.getVisualOverrides);
router.put('/visual-overrides', requireAuth, requireRole('superuser'), settingsController.saveVisualOverrides);
router.get('/sidebar-order', requireAuth, settingsController.getSidebarOrder);
router.put('/sidebar-order', requireAuth, settingsController.saveSidebarOrder);

module.exports = router;

export {};
