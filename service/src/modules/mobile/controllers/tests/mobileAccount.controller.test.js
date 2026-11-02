jest.mock('../../services/mobileAccount.service', () => ({
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  issueIdToken: jest.fn(),
  verifyIdToken: jest.fn(),
  requestLink: jest.fn(),
  listLinkRequests: jest.fn(),
  adoption: jest.fn(),
}));

const service = require('../../services/mobileAccount.service');
const controller = require('../mobileAccount.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

describe('mobile account controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // @MOB-024
  it('maps reset results to status codes', async () => {
    const cases = [
      [{ kind: 'sent', phone_hint: 'x' }, null],
      [{ kind: 'role_required' }, 409],
      [{ kind: 'no_phone' }, 422],
      [{ kind: 'too_many' }, 429],
      [{ kind: 'sms_unavailable' }, 503],
    ];
    for (const [result, status] of cases) {
      service.requestPasswordReset.mockResolvedValue(result);
      const res = createResponse();
      await controller.requestPasswordReset({ body: { username: ' ali ' } }, res);
      expect(service.requestPasswordReset).toHaveBeenLastCalledWith('ali', undefined);
      if (status) expect(res.status).toHaveBeenCalledWith(status);
      else expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ phone_hint: 'x' }));
    }

    for (const [kind, status] of [['expired', 400], ['too_many_attempts', 429], ['invalid', 400], ['role_required', 409]]) {
      service.confirmPasswordReset.mockResolvedValue({ kind });
      const res = createResponse();
      await controller.confirmPasswordReset({ body: { username: 'ali', code: '123456', new_password: 'secret1' } }, res);
      expect(res.status).toHaveBeenCalledWith(status);
    }
    service.confirmPasswordReset.mockResolvedValue({ kind: 'ok' });
    const res = createResponse();
    await controller.confirmPasswordReset({ body: { username: 'ali', code: '123456', new_password: 'secret1' } }, res);
    expect(res.status).not.toHaveBeenCalled();

    service.requestPasswordReset.mockRejectedValue(new Error('db'));
    const failed = createResponse();
    await controller.requestPasswordReset({ body: { username: 'ali' } }, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
  });

  // @MOB-125
  it('issues ID tokens for the signed-in student and verifies scanned ones', async () => {
    service.issueIdToken.mockReturnValue({ token: 't' });
    const res = createResponse();
    controller.idToken({ user: { id: '7' } }, res);
    expect(service.issueIdToken).toHaveBeenCalledWith(7);
    expect(res.json).toHaveBeenCalledWith({ token: 't' });

    const empty = createResponse();
    await controller.verifyIdToken({ query: {}, user: {} }, empty);
    expect(empty.status).toHaveBeenCalledWith(400);

    service.verifyIdToken.mockResolvedValue({ valid: true });
    const ok = createResponse();
    await controller.verifyIdToken({ query: { token: ' v1.7.1.x ' }, user: { center_id: 2 } }, ok);
    expect(service.verifyIdToken).toHaveBeenCalledWith('v1.7.1.x', { center_id: 2 });
    expect(ok.json).toHaveBeenCalledWith({ valid: true });
  });

  // @MOB-032 @MOB-166
  it('answers link requests and adoption', async () => {
    for (const [kind, status] of [['created', 201], ['already_linked', 200], ['invalid', 400], ['not_found', 404], ['duplicate', 409], ['too_many', 429]]) {
      service.requestLink.mockResolvedValue({ kind });
      const res = createResponse();
      await controller.createLinkRequest({ user: { id: 3 }, body: { child_query: 'ali' } }, res);
      expect(service.requestLink).toHaveBeenLastCalledWith(3, 'ali');
      expect(res.status).toHaveBeenCalledWith(status);
    }
    service.listLinkRequests.mockResolvedValue([{ request_id: 1 }]);
    const list = createResponse();
    await controller.listLinkRequests({ user: { id: 3 } }, list);
    expect(list.json).toHaveBeenCalledWith({ items: [{ request_id: 1 }] });

    service.adoption.mockResolvedValue({ parents_total: 1 });
    const stats = createResponse();
    await controller.adoption({}, stats);
    expect(stats.json).toHaveBeenCalledWith({ parents_total: 1 });
  });
});
