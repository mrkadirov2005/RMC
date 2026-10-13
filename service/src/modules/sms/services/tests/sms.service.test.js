jest.mock('../../repositories/sms.repository', () => ({
  enqueue: jest.fn(async (rows) => rows.length),
  findParentContacts: jest.fn(),
  countSentToday: jest.fn(async () => 0),
  claimDue: jest.fn(async () => []),
  markSent: jest.fn(),
  markRetry: jest.fn(),
  markFailed: jest.fn(),
  findAwaitingReport: jest.fn(async () => []),
  setStatus: jest.fn(),
  findRecent: jest.fn(),
  countQueued: jest.fn(async () => 0),
}));
jest.mock('../smsGateway', () => ({
  isConfigured: jest.fn(() => true),
  sendSms: jest.fn(),
  getSmsState: jest.fn(),
}));
jest.mock('../../../settings/repositories/settings.repository', () => ({ getSetting: jest.fn(async () => null), saveSetting: jest.fn() }));

const repository = require('../../repositories/sms.repository');
const gateway = require('../smsGateway');
const settingsRepository = require('../../../settings/repositories/settings.repository');
const service = require('../sms.service');

// 10:00 in Tashkent (UTC+5).
const MORNING = new Date('2026-10-13T05:00:00Z');
const NIGHT = new Date('2026-10-13T18:00:00Z');

const contact = (overrides = {}) => ({
  main_student_id: 10, first_name: 'Ali', last_name: 'Valiyev', center_id: 1, center_name: 'Temurbek',
  parent_phone: '90 123-45-67', parent_on_telegram: false, ...overrides,
});

describe('sms service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gateway.isConfigured.mockReturnValue(true);
    settingsRepository.getSetting.mockResolvedValue(null);
    delete process.env.SMS_DAILY_LIMIT;
  });

  it('reads Uzbek numbers in any common form', () => {
    expect(service.normalizePhone('90 123-45-67')).toBe('+998901234567');
    expect(service.normalizePhone('+998 (90) 123 45 67')).toBe('+998901234567');
    expect(service.normalizePhone('998901234567')).toBe('+998901234567');
    expect(service.normalizePhone('12345')).toBeNull();
    expect(service.normalizePhone('')).toBeNull();
  });

  it('keeps texts plain so one SMS holds 160 characters', () => {
    expect(service.plainText('<b>Oʻgʻil</b> — “ok”')).toBe('O\'g\'il - "ok"');
  });

  it('texts the parent of an absent child once per lesson, only when the parent is not on the bot', async () => {
    repository.findParentContacts.mockResolvedValue([
      contact(),
      contact({ main_student_id: 11, first_name: 'Bek', parent_on_telegram: true }),
      contact({ main_student_id: 12, first_name: 'Sardor', parent_phone: null }),
    ]);
    const rows = [
      { main_student_id: 10, attendance_status: 'Absent', session_date: '2099-10-13', subject_name: 'Ingliz tili' },
      { main_student_id: 11, attendance_status: 'Absent', session_date: '2099-10-13' },
      { main_student_id: 12, attendance_status: 'Absent', session_date: '2099-10-13' },
      { main_student_id: 13, attendance_status: 'Present', session_date: '2099-10-13' },
    ];
    expect(await service.queueLessonAbsences(77, rows)).toBe(1);
    expect(repository.findParentContacts).toHaveBeenCalledWith([10, 11, 12]);
    const [[queued]] = repository.enqueue.mock.calls;
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ studentId: 10, kind: 'absence', phone: '+998901234567', dedupeKey: 'absence:77:10' });
    expect(queued[0].text).toBe('Hurmatli ota-ona! Farzandingiz Ali Valiyev 13.10 kuni Ingliz tili darsiga kelmadi.\nTemurbek');
    // Noon the next day in Tashkent.
    expect(queued[0].expiresAt.toISOString()).toBe('2099-10-14T07:00:00.000Z');
  });

  it('does nothing for an old lesson saved again, or when no phone is connected', async () => {
    expect(await service.queueLessonAbsences(5, [{ main_student_id: 10, attendance_status: 'Absent', session_date: '2020-01-01' }])).toBe(0);
    gateway.isConfigured.mockReturnValue(false);
    expect(await service.queueLessonAbsences(5, [{ main_student_id: 10, attendance_status: 'Absent', session_date: '2099-01-01' }])).toBe(0);
    expect(repository.findParentContacts).not.toHaveBeenCalled();
  });

  it('respects a center that turned a kind of SMS off', async () => {
    settingsRepository.getSetting.mockResolvedValue({ payment_reminder: false });
    repository.findParentContacts.mockResolvedValue([contact()]);
    expect(await service.queuePaymentReminders([10], '2026-10')).toBe(0);
    expect(await service.getSettings(1)).toEqual({ absence: true, payment_reminder: false, teacher_feedback: true });
  });

  it('writes a payment reminder once a day per child', async () => {
    repository.findParentContacts.mockResolvedValue([contact()]);
    await service.queuePaymentReminders([10, 10], '2026-10', { id: 2, userType: 'superuser' });
    expect(repository.findParentContacts).toHaveBeenCalledWith([10]);
    const [[[row]]] = repository.enqueue.mock.calls;
    expect(row.text).toContain("Ali Valiyev uchun oktyabr oyi to'lovi hali qilinmagan");
    expect(row.dedupeKey).toMatch(/^payment:2026-10:10:\d{4}-\d{2}-\d{2}$/);
    expect(row).toMatchObject({ createdById: 2, createdByType: 'superuser' });
  });

  it('shortens a long teacher message', async () => {
    repository.findParentContacts.mockResolvedValue([contact()]);
    await service.queueTeacherFeedback(10, 'a'.repeat(600), 'Ibrohim M');
    const [[[row]]] = repository.enqueue.mock.calls;
    expect(row.text.startsWith('Ustozdan xabar (Ibrohim M) - Ali Valiyev:\n')).toBe(true);
    expect(row.text).toContain(`${'a'.repeat(297)}...`);
  });

  it('sends within the daily limit and only in sending hours', async () => {
    process.env.SMS_DAILY_LIMIT = '30';
    repository.countSentToday.mockResolvedValue(27);
    repository.claimDue.mockResolvedValue([{ sms_id: 1, phone: '+998901234567', text: 'hi', attempts: 1, expires_at: null }]);
    gateway.sendSms.mockResolvedValue({ id: 'g-1', state: 'Pending' });

    expect(await service.deliverDue(MORNING)).toEqual({ sent: 1 });
    expect(repository.claimDue).toHaveBeenCalledWith(3);
    expect(repository.markSent).toHaveBeenCalledWith(1, 'g-1');

    repository.claimDue.mockClear();
    await service.deliverDue(NIGHT);
    expect(repository.claimDue).toHaveBeenCalledWith(0);
    expect(gateway.sendSms).toHaveBeenCalledTimes(1);
  });

  it('tries again later after a passing failure and gives up on a lasting one', async () => {
    repository.claimDue.mockResolvedValue([
      { sms_id: 1, phone: '+998901234567', text: 'a', attempts: 2, expires_at: null },
      { sms_id: 2, phone: '+998901234568', text: 'b', attempts: 1, expires_at: null },
    ]);
    gateway.sendSms
      .mockRejectedValueOnce(Object.assign(new Error('unreachable'), { transient: true }))
      .mockRejectedValueOnce(Object.assign(new Error('bad login'), { transient: false }));
    await service.deliverDue(MORNING);
    expect(repository.markRetry).toHaveBeenCalledWith(1, 'unreachable', 4);
    expect(repository.markFailed).toHaveBeenCalledWith(2, 'bad login');
  });

  it('records what the phone reports back', async () => {
    repository.findAwaitingReport.mockResolvedValue([{ sms_id: 5, gateway_id: 'g-5' }, { sms_id: 6, gateway_id: 'g-6' }]);
    gateway.getSmsState.mockResolvedValueOnce({ state: 'Delivered', error: null }).mockResolvedValueOnce({ state: 'Failed', error: 'RESULT_ERROR_NO_SERVICE' });
    await service.deliverDue(NIGHT);
    expect(repository.setStatus).toHaveBeenCalledWith(5, 'delivered', null);
    expect(repository.setStatus).toHaveBeenCalledWith(6, 'failed', 'RESULT_ERROR_NO_SERVICE');
  });

  it('refuses a test SMS to a bad number or with no phone connected', async () => {
    expect(await service.sendTest('123', 1, {})).toEqual({ error: 'invalid_phone' });
    gateway.isConfigured.mockReturnValue(false);
    expect(await service.sendTest('+998901234567', 1, {})).toEqual({ error: 'not_configured' });
  });
});
