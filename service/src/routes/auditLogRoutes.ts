export {};

const express = require('express');
const router = express.Router();
const auditLogController = require('../modules/audit_logs');

router.get('/', auditLogController.getAuditLogs);

module.exports = router;
export {};
