export {};

const express = require('express');
const { validateParams } = require('../middleware/validation');
const { IdParamDto } = require('../dtos/request.dto');
const controller = require('../modules/parent_link_requests');

// Parents asking in the Telegram bot to follow a child; admins approve or reject them.
const router = express.Router();

router.get('/', controller.listRequests);
router.post('/:id/approve', validateParams(IdParamDto), controller.approveRequest);
router.post('/:id/reject', validateParams(IdParamDto), controller.rejectRequest);

module.exports = router;
