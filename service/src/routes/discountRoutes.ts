export {};

const express = require('express');
const { validateBody, validateParams } = require('../middleware/validation');
const { CreateDiscountDto, UpdateDiscountDto, IdParamDto } = require('../dtos/request.dto');
const router = express.Router();
const discountController = require('../modules/discounts');

router.get('/', discountController.getAllDiscounts);
router.get('/student/:studentId/active-any', discountController.getActiveDiscountByStudent);
router.get('/student/:studentId/active', discountController.getActiveSerialDiscountByStudent);
router.get('/:id', discountController.getDiscountById);
router.post('/', validateBody(CreateDiscountDto), discountController.createDiscount);
router.put('/:id', validateParams(IdParamDto), validateBody(UpdateDiscountDto), discountController.updateDiscount);
router.delete('/:id', validateParams(IdParamDto), discountController.deleteDiscount);

module.exports = router;
export {};
