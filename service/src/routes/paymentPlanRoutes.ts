export {};

const express = require('express');
const router = express.Router();
const paymentPlanController = require('../modules/payment_plans');

router.get('/', paymentPlanController.getAllPlans);
router.get('/:id', paymentPlanController.getPlanById);
router.post('/', paymentPlanController.createPlan);
router.put('/:id', paymentPlanController.updatePlan);
router.delete('/:id', paymentPlanController.deletePlan);

module.exports = router;
export {};
