const express = require('express');
const router = express.Router();
const systemController = require('../modules/system');
const { requireAuth, requireOwner } = require('../middleware/auth');

router.post('/redeploy', requireAuth, requireOwner, systemController.redeployServer);

module.exports = router;

export {};
