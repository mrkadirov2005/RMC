export {};

const express = require('express');
const { validateBody, validateParams } = require('../middleware/validation');
const { EntityParamDto, ImportCsvDto } = require('../dtos/request.dto');
const router = express.Router();
const importExportController = require('../modules/import_export');

router.get('/export/:entity', validateParams(EntityParamDto), importExportController.exportEntity);
router.post('/import/:entity', validateParams(EntityParamDto), validateBody(ImportCsvDto), importExportController.importEntity);
router.post('/sheets/push/:entity', validateParams(EntityParamDto), importExportController.pushEntityToSheets);
router.post('/sheets/pull/:entity', validateParams(EntityParamDto), importExportController.pullEntityFromSheets);

module.exports = router;
export {};
