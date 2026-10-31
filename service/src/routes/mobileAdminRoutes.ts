export {};

const express = require('express');
const admin = require('../modules/mobile/controllers/mobileAdmin.controller');
const account = require('../modules/mobile/controllers/mobileAccount.controller');

// @MOB-160 @MOB-161 @MOB-162 @MOB-164 Web panel management of the mobile app's content.
// Mounted at /api/mobile-admin behind requireAuth and the superuser role (admins and the owner).
const router = express.Router();

router.get('/links', admin.listLinks);
router.post('/links', admin.createLink);
router.put('/links/:id', admin.updateLink);
router.delete('/links/:id', admin.deleteLink);

router.get('/announcements', admin.listAnnouncements);
router.post('/announcements', admin.createAnnouncement);
router.delete('/announcements/:id', admin.deleteAnnouncement);

router.get('/policies', admin.listPolicies);
router.post('/policies', admin.createPolicy);
router.get('/policies/:id/versions', admin.policyVersions);
router.post('/policies/:id/versions', admin.publishPolicyVersion);

router.get('/help-requests', admin.listHelpRequests);
router.patch('/help-requests/:id', admin.updateHelpRequest);

// @MOB-166 App adoption numbers.
router.get('/adoption', account.adoption);

module.exports = router;
