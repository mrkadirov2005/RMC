export {};

const express = require('express');
const { requireRole } = require('../middleware/auth');
const { validateBody } = require('../middleware/validation');
const { CreateNotificationDto } = require('../dtos/request.dto');
const router = express.Router();
const notificationController = require('../modules/notifications');

router.get('/', notificationController.getMyNotifications);
router.post('/', requireRole('superuser'), validateBody(CreateNotificationDto), notificationController.createNotification);
router.patch('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
export {};
