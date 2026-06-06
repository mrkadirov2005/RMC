const express = require('express');
const router = express.Router();
const translationController = require('../modules/translations');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/', translationController.getAllTranslations);
router.get('/:id', translationController.getTranslationById);
router.post('/bulk', requireAuth, requireRole('superuser'), translationController.saveTranslations);
router.put('/:id', requireAuth, requireRole('superuser'), translationController.saveTranslation);
router.delete('/:id', requireAuth, requireRole('superuser'), translationController.deleteTranslation);

module.exports = router;

export {};
