export {};

const express = require('express');
const archiveController = require('../modules/archive/controllers/archive.controller');
const graduateController = require('../modules/archive/controllers/graduate.controller');
const { requireMuzaffarHardDelete } = require('../middleware/auth');

const router = express.Router();

// Graduates ("finished successfully") and their certificate PDFs. Declared before /:entity routes.
router.get('/graduates', graduateController.getGraduates);
router.post('/graduates/:studentId/certificates', graduateController.uploadCertificate);
router.get('/certificates/:id/file', graduateController.downloadCertificate);
router.delete('/certificates/:id', graduateController.removeCertificate);

router.get('/', archiveController.getArchive);
router.post('/:entity/:id/restore', archiveController.restoreArchiveItem);
router.delete('/:entity/:id/purge', requireMuzaffarHardDelete, archiveController.purgeArchiveItem);

module.exports = router;
