jest.mock('../../services/mobileAuth.service', () => ({
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  me: jest.fn(),
  listDevices: jest.fn(),
  revokeDevice: jest.fn(),
}));

const service = require('../../services/mobileAuth.service');
const controller = require('../mobileAuth.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('mobile auth controller', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // @MOB-022
  it.each([
    ['role_required', 409, 'ROLE_REQUIRED'],
    ['inactive', 403, 'ACCOUNT_INACTIVE'],
    ['invalid', 401, 'INVALID_CREDENTIALS'],
  ])('login maps %s to %i', async (kind, status, code) => {
    service.login.mockResolvedValue({ kind });
    const res = createResponse();

    await controller.login({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
  });

  it('login returns tokens without the internal kind', async () => {
    service.login.mockResolvedValue({ kind: 'ok', access_token: 'a', refresh_token: 'r' });
    const res = createResponse();

    await controller.login({ body: {} }, res);

    expect(res.json).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
  });

  // @MOB-023
  it.each([
    ['reused', 'REFRESH_TOKEN_REUSED'],
    ['expired', 'REFRESH_TOKEN_EXPIRED'],
    ['inactive', 'ACCOUNT_INACTIVE'],
    ['invalid', 'REFRESH_TOKEN_INVALID'],
  ])('refresh answers %s with 401 %s', async (kind, code) => {
    service.refresh.mockResolvedValue({ kind });
    const res = createResponse();

    await controller.refresh({ body: { refresh_token: 't' } }, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code }));
  });

  it('refresh returns the new pair', async () => {
    service.refresh.mockResolvedValue({ kind: 'ok', access_token: 'a2' });
    const res = createResponse();

    await controller.refresh({ body: { refresh_token: 't' } }, res);

    expect(res.json).toHaveBeenCalledWith({ access_token: 'a2' });
  });

  it('logout always confirms', async () => {
    service.logout.mockResolvedValue({ kind: 'ok' });
    const res = createResponse();
    await controller.logout({ body: { refresh_token: 't' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
  });

  it('me answers 404 for a missing account', async () => {
    service.me.mockResolvedValue(null);
    const res = createResponse();
    await controller.me({ user: {} }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('devices are wrapped in items', async () => {
    service.listDevices.mockResolvedValue([{ session_id: 1 }]);
    const res = createResponse();
    await controller.listDevices({ user: {} }, res);
    expect(res.json).toHaveBeenCalledWith({ items: [{ session_id: 1 }] });
  });

  it('revokeDevice validates the id and reports a missing device', async () => {
    let res = createResponse();
    await controller.revokeDevice({ user: {}, params: { sessionId: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.revokeDevice.mockResolvedValue(false);
    res = createResponse();
    await controller.revokeDevice({ user: {}, params: { sessionId: '4' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);

    service.revokeDevice.mockResolvedValue(true);
    res = createResponse();
    await controller.revokeDevice({ user: {}, params: { sessionId: '4' } }, res);
    expect(res.json).toHaveBeenCalledWith({ message: expect.any(String) });
  });

  it.each(['login', 'refresh', 'logout', 'me', 'listDevices'])('%s answers 500 when the service throws', async (handler) => {
    service[handler].mockRejectedValue(new Error('db down'));
    const res = createResponse();

    await controller[handler]({ body: {}, user: {} }, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
