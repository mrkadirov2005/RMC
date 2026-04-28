export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { CreateRefundDto } = require('../dtos/request.dto');
const router = express.Router();
const refundController = require('../modules/refunds');

router.get('/', refundController.getAllRefunds);
router.get('/:id', refundController.getRefundById);
router.post('/', validateBody(CreateRefundDto), refundController.createRefund);
router.put('/:id', refundController.updateRefund);
router.delete('/:id', refundController.deleteRefund);

module.exports = router;
export {};
