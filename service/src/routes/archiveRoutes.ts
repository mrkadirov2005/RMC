export {};

const express = require('express');
const archiveController = require('../modules/archive/controllers/archive.controller');
const { requireMuzaffarHardDelete } = require('../middleware/auth');

const router = express.Router();

router.get('/', archiveController.getArchive);
router.post('/:entity/:id/restore', archiveController.restoreArchiveItem);
router.delete('/:entity/:id/purge', requireMuzaffarHardDelete, archiveController.purgeArchiveItem);

module.exports = router;
