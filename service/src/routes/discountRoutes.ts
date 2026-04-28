export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { CreateDiscountDto } = require('../dtos/request.dto');
const router = express.Router();
const discountController = require('../modules/discounts');

router.get('/', discountController.getAllDiscounts);
router.get('/:id', discountController.getDiscountById);
router.post('/', validateBody(CreateDiscountDto), discountController.createDiscount);
router.put('/:id', discountController.updateDiscount);
router.delete('/:id', discountController.deleteDiscount);

module.exports = router;
export {};
