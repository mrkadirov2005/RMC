jest.mock('../../services/mobileNotification.service', () => ({
  savePushToken: jest.fn(),
  inbox: jest.fn(),
  markRead: jest.fn(),
  preferences: jest.fn(),
  setPreference: jest.fn(),
}));
jest.mock('../../repositories/mobileSession.repository', () => ({}));

const service = require('../../services/mobileNotification.service');
const controller = require('../mobileNotification.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const user = { id: 7, userType: 'student', sid: 2 };

describe('mobile notification controller', () => {
  beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));

  // @MOB-040
  it('accepts Expo tokens, null to clear, and rejects anything else', async () => {
    service.savePushToken.mockResolvedValue(true);
    let res = createResponse();
    await controller.savePushToken({ user, body: { push_token: 'ExponentPushToken[abc]' } }, res);
    expect(service.savePushToken).toHaveBeenCalledWith(user, 'ExponentPushToken[abc]');

    res = createResponse();
    await controller.savePushToken({ user, body: { push_token: null } }, res);
    expect(service.savePushToken).toHaveBeenLastCalledWith(user, null);

    res = createResponse();
    await controller.savePushToken({ user, body: { push_token: 'http://evil' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.savePushToken.mockResolvedValue(false);
    res = createResponse();
    await controller.savePushToken({ user, body: { push_token: 'ExponentPushToken[abc]' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // @MOB-043
  it('lists the inbox with paging', async () => {
    service.inbox.mockResolvedValue({ items: [] });
    const res = createResponse();
    await controller.list({ user, query: { page: '2', page_size: '10' } }, res);
    expect(service.inbox).toHaveBeenCalledWith(user, 2, 10);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it('marks one or all notifications read and validates the id', async () => {
    let res = createResponse();
    await controller.markRead({ user, body: { notification_id: 4 } }, res);
    expect(service.markRead).toHaveBeenCalledWith(user, 4);

    await controller.markRead({ user, body: {} }, createResponse());
    expect(service.markRead).toHaveBeenLastCalledWith(user, undefined);

    res = createResponse();
    await controller.markRead({ user, body: { notification_id: 'x' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('reads and updates preferences', async () => {
    service.preferences.mockResolvedValue({ items: [] });
    let res = createResponse();
    await controller.getPreferences({ user }, res);
    expect(res.json).toHaveBeenCalledWith({ items: [] });

    res = createResponse();
    await controller.setPreference({ user, body: { category: 'coins', enabled: 'yes' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);

    service.setPreference.mockResolvedValue(false);
    res = createResponse();
    await controller.setPreference({ user, body: { category: 'nope', enabled: true } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UNKNOWN_CATEGORY' }));

    service.setPreference.mockResolvedValue(true);
    res = createResponse();
    await controller.setPreference({ user, body: { category: 'coins', enabled: false } }, res);
    expect(service.setPreference).toHaveBeenLastCalledWith(user, 'coins', false);
    expect(res.json).toHaveBeenCalledWith({ items: [] });
  });

  it.each([
    ['savePushToken', 'savePushToken', { push_token: null }],
    ['list', 'inbox', {}],
    ['markRead', 'markRead', {}],
    ['getPreferences', 'preferences', {}],
    ['setPreference', 'setPreference', { category: 'coins', enabled: true }],
  ])('%s answers 500 when the service throws', async (handler, method, body) => {
    service[method].mockRejectedValue(new Error('db'));
    const res = createResponse();
    await controller[handler]({ user, body, query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
