export {};

const express = require('express');
const { validateBody, validateParams } = require('../middleware/validation');
const { CreatePaymentPlanDto, IdParamDto } = require('../dtos/request.dto');
const router = express.Router();
const paymentPlanController = require('../modules/payment_plans');

router.get('/', paymentPlanController.getAllPlans);
router.get('/:id', validateParams(IdParamDto), paymentPlanController.getPlanById);
router.post('/', validateBody(CreatePaymentPlanDto), paymentPlanController.createPlan);
router.put('/:id', validateParams(IdParamDto), paymentPlanController.updatePlan);
router.delete('/:id', validateParams(IdParamDto), paymentPlanController.deletePlan);

module.exports = router;
export {};
