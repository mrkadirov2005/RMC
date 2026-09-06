export {};

const crypto = require('crypto');

const secretsMatch = (actual: string, expected: string) => {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

function requireTelegramBotSecret(req: any, res: any, next: any): void {
  const expected = String(process.env.TELEGRAM_BOT_SHARED_SECRET || '');
  if (!expected) {
    res.status(503).json({ error: 'Telegram bot integration is not configured.' });
    return;
  }
  const provided = String(req.headers['x-telegram-bot-secret'] || '');
  if (!provided || !secretsMatch(provided, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

module.exports = { requireTelegramBotSecret };
