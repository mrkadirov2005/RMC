const service = require('../services/telegram_student.service');

const telegramUserIdFrom = (req: any) =>
  String(
    req.query.telegram_user_id ||
    req.body?.telegram_user_id ||
    req.headers['x-telegram-user-id'] ||
    ''
  ).trim();

const sendError = (res: any, error: any) => {
  const status = Number(error?.status || 500);
  res.status(status).json({
    error: status === 500 ? 'Failed to load Telegram student account' : error.message,
    details: status === 500 ? error.message || String(error) : undefined,
  });
};

const getMenu = async (req: any, res: any) => {
  try {
    res.json(await service.menu(telegramUserIdFrom(req)));
  } catch (error: any) {
    sendError(res, error);
  }
};

const getLastLesson = async (req: any, res: any) => {
  try {
    res.json(await service.lastLesson(telegramUserIdFrom(req)));
  } catch (error: any) {
    sendError(res, error);
  }
};

const getRankings = async (req: any, res: any) => {
  try {
    res.json(await service.rankings(telegramUserIdFrom(req), String(req.params.scope || 'class')));
  } catch (error: any) {
    sendError(res, error);
  }
};

const getResults = async (req: any, res: any) => {
  try {
    res.json(await service.results(telegramUserIdFrom(req), Number(req.query.page || 1), Number(req.query.limit || 10)));
  } catch (error: any) {
    sendError(res, error);
  }
};

module.exports = { getMenu, getLastLesson, getRankings, getResults };

export {};
