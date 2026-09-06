export {};

const express = require('express');
const { validateBody, validateParams } = require('../middleware/validation');
const { CreateSavedFilterDto, UpdateSavedFilterDto, IdParamDto } = require('../dtos/request.dto');
const router = express.Router();
const savedFilterController = require('../modules/saved_filters');

router.get('/', savedFilterController.getMyFilters);
router.post('/', validateBody(CreateSavedFilterDto), savedFilterController.createFilter);
router.put('/:id', validateParams(IdParamDto), validateBody(UpdateSavedFilterDto), savedFilterController.updateFilter);
router.delete('/:id', validateParams(IdParamDto), savedFilterController.deleteFilter);

module.exports = router;
export {};
