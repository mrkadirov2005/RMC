export {};

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const { CreateNotificationDto, IdParamDto } = require('../dtos/request.dto');
const router = express.Router();
const notificationController = require('../modules/notifications');

router.get('/', notificationController.getMyNotifications);
router.post('/', requireRole('superuser'), validateBody(CreateNotificationDto), notificationController.createNotification);
router.patch('/:id/read', validateParams(IdParamDto), notificationController.markAsRead);
router.delete('/:id', validateParams(IdParamDto), notificationController.deleteNotification);

module.exports = router;
export {};
