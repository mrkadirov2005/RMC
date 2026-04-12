export {};

const express = require('express');
const router = express.Router();
const savedFilterController = require('../modules/saved_filters');

router.get('/', savedFilterController.getMyFilters);
router.post('/', savedFilterController.createFilter);
router.put('/:id', savedFilterController.updateFilter);
router.delete('/:id', savedFilterController.deleteFilter);

module.exports = router;
export {};
