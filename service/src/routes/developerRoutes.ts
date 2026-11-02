export {};

// The developer account only (mounted behind requireAuth and requireDeveloper in index.ts).
const express = require('express');
const developer = require('../modules/developer/developer.controller');

const router = express.Router();

router.get('/accounts', developer.searchAccounts);
router.get('/locks', developer.listLocks);
router.post('/locks', developer.lockAccount);
router.delete('/locks/:userType/:userId', developer.unlockAccount);
router.put('/lockdown', developer.setLockdown);
router.get('/owners', developer.listOwners);
router.post('/owners/:id/unlock', developer.unlockOwnerPassword);
router.post('/owners/:id/password', developer.resetOwnerPassword);

module.exports = router;
