jest.mock('../../services/mobileOnboarding.service', () => ({
  state: jest.fn(),
  telegramStatus: jest.fn(),
  markInstagramOpened: jest.fn(),
  finish: jest.fn(),
  answerConsent: jest.fn(),
}));

const service = require('../../services/mobileOnboarding.service');
const controller = require('../mobileOnboarding.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};
const parent = { user: { userType: 'parent', id: '3' } };

describe('mobile onboarding controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // @MOB-112 @MOB-113
  it('passes the signed-in user to every step', async () => {
    service.state.mockResolvedValue({ show: true });
    const res = createResponse();
    await controller.state(parent, res);
    expect(service.state).toHaveBeenCalledWith('parent', 3);
    expect(res.json).toHaveBeenCalledWith({ show: true });

    service.telegramStatus.mockResolvedValue({ status: 'verified' });
    await controller.checkTelegram(parent, createResponse());
    expect(service.telegramStatus).toHaveBeenCalledWith('parent', 3, { fresh: true });

    await controller.instagramOpened(parent, createResponse());
    expect(service.markInstagramOpened).toHaveBeenCalledWith('parent', 3);

    await controller.finish({ ...parent, body: { skipped: true } }, createResponse());
    expect(service.finish).toHaveBeenLastCalledWith('parent', 3, true);
    await controller.finish({ ...parent, body: {} }, createResponse());
    expect(service.finish).toHaveBeenLastCalledWith('parent', 3, false);

    service.state.mockRejectedValue(new Error('db'));
    const failed = createResponse();
    await controller.state(parent, failed);
    expect(failed.status).toHaveBeenCalledWith(500);
  });

  // @MOB-112
  it('validates and maps consent answers', async () => {
    const bad = createResponse();
    await controller.answerConsent({ ...parent, body: { student_id: 7, granted: 'yes' } }, bad);
    expect(bad.status).toHaveBeenCalledWith(400);

    for (const [kind, status] of [['invalid', 400], ['not_found', 404], ['parent_required', 403]]) {
      service.answerConsent.mockResolvedValue({ kind });
      const res = createResponse();
      await controller.answerConsent({ ...parent, body: { student_id: 7, granted: true } }, res);
      expect(res.status).toHaveBeenCalledWith(status);
    }
    service.answerConsent.mockResolvedValue({ kind: 'ok', consent: { consent_id: 1 } });
    const ok = createResponse();
    await controller.answerConsent({ ...parent, body: { student_id: 7, kind: 'video', granted: false } }, ok);
    expect(service.answerConsent).toHaveBeenLastCalledWith('parent', 3, 7, 'video', false);
    expect(ok.json).toHaveBeenCalledWith({ consent_id: 1 });
  });
});
