export {};

const express = require('express');
const router = express.Router();
const smsController = require('../modules/sms/controllers/sms.controller');

router.get('/status', smsController.getStatus);
router.post('/payment', smsController.sendPaymentSms);
router.post('/attendance', smsController.sendAttendanceSms);
router.get('/attendance/sent', smsController.listAttendanceSent);
router.get('/messages', smsController.listMessages);
router.post('/test', smsController.sendTest);
router.get('/templates', smsController.listTemplates);
router.post('/templates', smsController.createTemplate);
router.put('/templates/:id', smsController.updateTemplate);
router.delete('/templates/:id', smsController.deleteTemplate);
router.put('/templates/:id/active', smsController.setTemplateActive);

module.exports = router;
