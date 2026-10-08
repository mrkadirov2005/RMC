export {};

const express = require('express');
const router = express.Router();
const telegramController = require('../modules/telegram/controllers/telegram.controller');
const { requireRole } = require('../middleware/auth');

router.post('/feedback', telegramController.sendFeedback);
router.get('/inbox', telegramController.getInbox);
router.patch('/inbox/:id/read', telegramController.markInboxRead);
router.post('/payment-reminders', requireRole('superuser'), telegramController.sendPaymentReminders);
router.get('/content', requireRole('superuser'), telegramController.getBotContent);
router.put('/content', requireRole('superuser'), telegramController.saveBotContent);
router.get('/stats', requireRole('superuser'), telegramController.getLinkStats);

module.exports = router;
