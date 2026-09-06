const express = require('express');
const router = express.Router();
const translationController = require('../modules/translations');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { SaveTranslationDto, BulkUpsertTranslationsDto } = require('../dtos/request.dto');

router.get('/', translationController.getAllTranslations);
router.get('/:id', translationController.getTranslationById);
router.post('/bulk', requireAuth, requireRole('superuser'), validateBody(BulkUpsertTranslationsDto), translationController.saveTranslations);
router.put('/:id', requireAuth, requireRole('superuser'), validateBody(SaveTranslationDto), translationController.saveTranslation);
router.delete('/:id', requireAuth, requireRole('superuser'), translationController.deleteTranslation);

module.exports = router;

export {};
