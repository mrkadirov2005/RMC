export {};

const express = require('express');
const router = express.Router();
const searchController = require('../modules/search');

router.get('/', searchController.search);

module.exports = router;
export {};
