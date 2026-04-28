export {};

const express = require('express');
const { validateQuery } = require('../middleware/validation');
const { SearchQueryDto } = require('../dtos/request.dto');
const router = express.Router();
const searchController = require('../modules/search');

router.get('/', validateQuery(SearchQueryDto), searchController.search);

module.exports = router;
export {};
