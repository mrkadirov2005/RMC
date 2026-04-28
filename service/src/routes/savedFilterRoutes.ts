export {};

const express = require('express');
const { validateBody } = require('../middleware/validation');
const { CreateSavedFilterDto } = require('../dtos/request.dto');
const router = express.Router();
const savedFilterController = require('../modules/saved_filters');

router.get('/', savedFilterController.getMyFilters);
router.post('/', validateBody(CreateSavedFilterDto), savedFilterController.createFilter);
router.put('/:id', savedFilterController.updateFilter);
router.delete('/:id', savedFilterController.deleteFilter);

module.exports = router;
export {};
