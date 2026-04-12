export {};

const express = require('express');
const router = express.Router();
const importExportController = require('../modules/import_export');

router.get('/export/:entity', importExportController.exportEntity);
router.post('/import/:entity', importExportController.importEntity);

module.exports = router;
export {};
