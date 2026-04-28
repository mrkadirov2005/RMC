export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { CreatePaymentPlanDto } = require('../dtos/request.dto');
const router = express.Router();
const paymentPlanController = require('../modules/payment_plans');

router.get('/', paymentPlanController.getAllPlans);
router.get('/:id', paymentPlanController.getPlanById);
router.post('/', validateBody(CreatePaymentPlanDto), paymentPlanController.createPlan);
router.put('/:id', paymentPlanController.updatePlan);
router.delete('/:id', paymentPlanController.deletePlan);

module.exports = router;
export {};
