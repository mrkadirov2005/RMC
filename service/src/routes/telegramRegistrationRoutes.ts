export {};

const express = require('express');
const { validateBody, validateParams } = require('../middleware/validation');
const { ConvertTelegramRegistrationDto, IdParamDto } = require('../dtos/request.dto');
const controller = require('../modules/telegram_registrations');

const router = express.Router();

router.get('/', controller.listRegistrations);
router.post('/:id/convert', validateParams(IdParamDto), validateBody(ConvertTelegramRegistrationDto), controller.convertRegistration);
router.post('/:id/reject', validateParams(IdParamDto), controller.rejectRegistration);

module.exports = router;
