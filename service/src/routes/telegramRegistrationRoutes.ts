export {};

const express = require('express');
const { validateParams } = require('../middleware/validation');
const { IdParamDto } = require('../dtos/request.dto');
const controller = require('../modules/telegram_registrations');

const router = express.Router();

router.get('/', controller.listRegistrations);
router.post('/:id/convert', validateParams(IdParamDto), controller.convertRegistration);
router.post('/:id/reject', validateParams(IdParamDto), controller.rejectRegistration);

module.exports = router;
