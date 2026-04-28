export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { CreateInvoiceDto } = require('../dtos/request.dto');
const router = express.Router();
const invoiceController = require('../modules/invoices');

router.get('/', invoiceController.getAllInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', validateBody(CreateInvoiceDto), invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

module.exports = router;
export {};
