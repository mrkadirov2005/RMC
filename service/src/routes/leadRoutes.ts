export {};

const express = require('express');
const router = express.Router();
const leadController = require('../modules/leads/controllers/lead.controller');

router.get('/', leadController.getLeads);
router.get('/due-count', leadController.getDueCount);
router.post('/', leadController.createLead);
router.put('/:id', leadController.updateLead);
router.post('/:id/close', leadController.closeLead);

module.exports = router;
