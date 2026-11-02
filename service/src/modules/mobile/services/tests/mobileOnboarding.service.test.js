jest.mock('../../repositories/mobileOnboarding.repository', () => ({
  getState: jest.fn(),
  saveState: jest.fn(),
  telegramUserId: jest.fn(),
  consentSubjects: jest.fn(),
  addConsent: jest.fn(),
  instagramLink: jest.fn(),
}));

const repo = require('../../repositories/mobileOnboarding.repository');
const service = require('../mobileOnboarding.service');

const telegramReply = (body) => jest.fn().mockResolvedValue({ status: 200, json: async () => body });

describe('mobile onboarding service', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    service.memberCache.clear();
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    process.env.TELEGRAM_REQUIRED_CHANNEL = '@temurbekschool';
    process.env.TELEGRAM_BOT_USERNAME = 'temurbek_bot';
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    process.env = env;
  });

  // @MOB-113
  describe('telegram status', () => {
    it('is verified for a channel member and remembers it', async () => {
      repo.telegramUserId.mockResolvedValue(555);
      const fetchFn = telegramReply({ ok: true, result: { status: 'member' } });
      await expect(service.telegramStatus('student', 7, { fetchFn })).resolves.toEqual({
        status: 'verified', channel_url: 'https://t.me/temurbekschool', bot_url: 'https://t.me/temurbek_bot',
      });
      expect(JSON.parse(fetchFn.mock.calls[0][1].body)).toEqual({ chat_id: '@temurbekschool', user_id: 555 });
      expect(repo.saveState).toHaveBeenCalledWith('student', 7, { telegram: true });
    });

    it('returns not member, not linked, not configured and unavailable', async () => {
      repo.telegramUserId.mockResolvedValue(555);
      await expect(service.telegramStatus('parent', 3, { fetchFn: telegramReply({ ok: true, result: { status: 'left' } }) })).resolves.toMatchObject({ status: 'not_member' });
      await expect(service.telegramStatus('parent', 3, { fresh: true, fetchFn: telegramReply({ ok: false, description: 'Bad Request: user not found' }) })).resolves.toMatchObject({ status: 'not_member' });
      // The bot is not an admin of the channel: never shown as verified.
      await expect(service.telegramStatus('parent', 3, { fresh: true, fetchFn: telegramReply({ ok: false, description: 'Bad Request: member list is inaccessible' }) })).resolves.toMatchObject({ status: 'unavailable' });
      await expect(service.telegramStatus('parent', 3, { fresh: true, fetchFn: jest.fn().mockRejectedValue(new Error('offline')) })).resolves.toMatchObject({ status: 'unavailable' });
      expect(repo.saveState).not.toHaveBeenCalled();

      repo.telegramUserId.mockResolvedValue(null);
      await expect(service.telegramStatus('parent', 3)).resolves.toMatchObject({ status: 'not_linked' });
      process.env.TELEGRAM_REQUIRED_CHANNEL = '';
      await expect(service.telegramStatus('parent', 3)).resolves.toMatchObject({ status: 'not_configured' });
    });

    it('caches answers for ten minutes unless asked for a fresh check', async () => {
      repo.telegramUserId.mockResolvedValue(555);
      const first = telegramReply({ ok: true, result: { status: 'left' } });
      await service.telegramStatus('student', 7, { fetchFn: first });
      const second = telegramReply({ ok: true, result: { status: 'member' } });
      await expect(service.telegramStatus('student', 7, { fetchFn: second })).resolves.toMatchObject({ status: 'not_member' });
      expect(second).not.toHaveBeenCalled();
      await expect(service.telegramStatus('student', 7, { fresh: true, fetchFn: second })).resolves.toMatchObject({ status: 'verified' });
    });
  });

  // @MOB-112
  describe('consent', () => {
    const now = new Date('2026-10-31T12:00:00');

    it('counts age to the day and treats an unknown birthday as a minor', () => {
      expect(service.ageOn('2008-10-31', now)).toBe(18);
      expect(service.ageOn('2008-11-01', now)).toBe(17);
      expect(service.ageOn(null, now)).toBeNull();
    });

    it('lets a parent answer for any child and a student only as an adult', async () => {
      repo.consentSubjects.mockResolvedValue([
        { student_id: 7, first_name: 'Ali', date_of_birth: '2014-05-01', granted: null },
        { student_id: 8, first_name: 'Vali', date_of_birth: null, granted: true },
      ]);
      const forParent = await service.consents('parent', 3, now);
      expect(forParent.map((c) => [c.student_id, c.minor, c.can_answer, c.granted])).toEqual([[7, true, true, null], [8, true, true, true]]);

      repo.consentSubjects.mockResolvedValue([{ student_id: 9, date_of_birth: '2001-01-01', granted: null }]);
      expect((await service.consents('student', 9, now))[0]).toMatchObject({ minor: false, can_answer: true });
      repo.consentSubjects.mockResolvedValue([{ student_id: 9, date_of_birth: '2012-01-01', granted: null }]);
      expect((await service.consents('student', 9, now))[0]).toMatchObject({ minor: true, can_answer: false });
    });

    it('saves allowed answers and refuses others', async () => {
      repo.consentSubjects.mockResolvedValue([{ student_id: 9, date_of_birth: '2012-01-01', granted: null }]);
      await expect(service.answerConsent('student', 9, 9, 'video', true)).resolves.toEqual({ kind: 'parent_required' });
      await expect(service.answerConsent('student', 9, 10, 'video', true)).resolves.toEqual({ kind: 'not_found' });
      await expect(service.answerConsent('student', 9, 9, 'photos', true)).resolves.toEqual({ kind: 'invalid' });

      repo.consentSubjects.mockResolvedValue([{ student_id: 7, date_of_birth: null, granted: null }]);
      repo.addConsent.mockResolvedValue({ consent_id: 1 });
      await expect(service.answerConsent('parent', 3, 7, 'video', false)).resolves.toEqual({ kind: 'ok', consent: { consent_id: 1 } });
      expect(repo.addConsent).toHaveBeenCalledWith({ studentId: 7, kind: 'video', granted: false, byType: 'parent', byId: 3 });
    });
  });

  // @MOB-112
  it('shows onboarding until finished or skipped, and records the steps', async () => {
    repo.telegramUserId.mockResolvedValue(null);
    repo.consentSubjects.mockResolvedValue([]);
    repo.instagramLink.mockResolvedValue('https://instagram.com/temurbek');
    repo.getState.mockResolvedValue(null);
    await expect(service.state('student', 7)).resolves.toMatchObject({ show: true, instagram: { url: 'https://instagram.com/temurbek', opened: false } });
    repo.getState.mockResolvedValue({ skipped: true, instagram_opened_at: new Date() });
    await expect(service.state('student', 7)).resolves.toMatchObject({ show: false, skipped: true, instagram: { opened: true } });

    await service.finish('student', 7, true);
    expect(repo.saveState).toHaveBeenLastCalledWith('student', 7, { skipped: true });
    await service.finish('student', 7, false);
    expect(repo.saveState).toHaveBeenLastCalledWith('student', 7, { completed: true, skipped: false });
    await service.markInstagramOpened('parent', 3);
    expect(repo.saveState).toHaveBeenLastCalledWith('parent', 3, { instagram: true });
  });
});
