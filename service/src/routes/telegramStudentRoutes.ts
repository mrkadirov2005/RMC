export {};

const express = require('express');
const controller = require('../modules/telegram_students');

const router = express.Router();

router.get('/menu', controller.getMenu);
router.get('/last-lesson', controller.getLastLesson);
router.get('/rankings/:scope', controller.getRankings);
router.get('/results', controller.getResults);
router.get('/payments', controller.getPayments);

module.exports = router;
