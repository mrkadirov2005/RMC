export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { ImportCsvDto } = require('../dtos/request.dto');
const router = express.Router();
const importExportController = require('../modules/import_export');

router.get('/export/:entity', importExportController.exportEntity);
router.post('/import/:entity', validateBody(ImportCsvDto), importExportController.importEntity);

module.exports = router;
export {};
