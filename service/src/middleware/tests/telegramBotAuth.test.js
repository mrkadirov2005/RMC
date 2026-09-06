// RMC-003/RMC-042: telegram_students routes have no other consumer in this
// codebase, so this test exists purely to prove requireTelegramBotSecret
// actually gates them and to catch a future regression that re-exposes them
// without the shared-secret check.
const { requireTelegramBotSecret } = require('../telegramBotAuth');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('requireTelegramBotSecret middleware (RMC-042)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, TELEGRAM_BOT_SHARED_SECRET: 'super-secret-value' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('rejects a request with no shared-secret header at all', () => {
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    requireTelegramBotSecret(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('rejects a request with an incorrect shared-secret header', () => {
    const req = { headers: { 'x-telegram-bot-secret': 'wrong-value' } };
    const res = createResponse();
    const next = jest.fn();

    requireTelegramBotSecret(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects a request whose secret is a different length than expected (still constant-time safe)', () => {
    const req = { headers: { 'x-telegram-bot-secret': 'short' } };
    const res = createResponse();
    const next = jest.fn();

    requireTelegramBotSecret(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('allows the request through when the correct shared secret is provided', () => {
    const req = { headers: { 'x-telegram-bot-secret': 'super-secret-value' } };
    const res = createResponse();
    const next = jest.fn();

    requireTelegramBotSecret(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('refuses every request with 503 when the server has no shared secret configured (fails closed, not open)', () => {
    process.env.TELEGRAM_BOT_SHARED_SECRET = '';
    const req = { headers: { 'x-telegram-bot-secret': 'anything' } };
    const res = createResponse();
    const next = jest.fn();

    requireTelegramBotSecret(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
