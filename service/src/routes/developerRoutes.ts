export {};

// The developer account only (mounted behind requireAuth and requireDeveloper in index.ts).
const express = require('express');
const developer = require('../modules/developer/developer.controller');

const router = express.Router();

const sealed = developer.requireIntactSeal;

router.get('/accounts', developer.searchAccounts);
router.get('/locks', developer.listLocks);
router.post('/locks', sealed, developer.lockAccount);
router.delete('/locks/:userType/:userId', sealed, developer.unlockAccount);
router.put('/lockdown', sealed, developer.setLockdown);
router.get('/owners', developer.listOwners);
router.post('/owners/:id/unlock', developer.unlockOwnerPassword);
router.post('/owners/:id/password', sealed, developer.resetOwnerPassword);
// What owners and admins may do (e.g. change group prices).
router.get('/permissions', developer.listPermissions);
router.put('/permissions/:key', sealed, developer.updatePermission);
// The seal: what changed outside the app, and putting it back or accepting it.
router.get('/seal', developer.sealStatus);
router.post('/seal/restore', developer.restoreSeal);
router.post('/seal/accept', developer.acceptSeal);

module.exports = router;
