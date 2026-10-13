export {};

const express = require('express');
const router = express.Router();
const smsController = require('../modules/sms/controllers/sms.controller');

router.get('/status', smsController.getStatus);
router.put('/settings', smsController.saveSettings);
router.get('/messages', smsController.listMessages);
router.post('/test', smsController.sendTest);

module.exports = router;
