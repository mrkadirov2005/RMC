export {};

const express = require('express');
const archiveController = require('../modules/archive/controllers/archive.controller');

const router = express.Router();

router.get('/', archiveController.getArchive);

module.exports = router;
