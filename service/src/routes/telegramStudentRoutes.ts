export {};

const express = require('express');
const controller = require('../modules/telegram_students');
const { requireTelegramBotSecret } = require('../middleware/telegramBotAuth');

const router = express.Router();

router.get('/menu', requireTelegramBotSecret, controller.getMenu);
router.get('/last-lesson', requireTelegramBotSecret, controller.getLastLesson);
router.get('/rankings/:scope', requireTelegramBotSecret, controller.getRankings);
router.get('/results', requireTelegramBotSecret, controller.getResults);
router.get('/payments', requireTelegramBotSecret, controller.getPayments);

module.exports = router;
