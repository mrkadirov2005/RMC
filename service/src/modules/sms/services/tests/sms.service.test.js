jest.mock('../../repositories/sms.repository', () => ({
  enqueue: jest.fn(async (rows) => rows.map((row) => row.dedupeKey ?? null)),
  findPaymentFigures: jest.fn(),
  findAttendanceFacts: jest.fn(),
  findAttendanceSent: jest.fn(),
  findSenderName: jest.fn(),
  countSentToday: jest.fn(async () => 0),
  claimDue: jest.fn(async () => []),
  markSent: jest.fn(),
  markRetry: jest.fn(),
  markFailed: jest.fn(),
  findAwaitingReport: jest.fn(async () => []),
  setStatus: jest.fn(),
  findMessages: jest.fn(),
  countQueued: jest.fn(async () => 0),
}));
jest.mock('../../repositories/smsTemplates.repository', () => ({
  findActiveBodies: jest.fn(async () => ({})),
}));
jest.mock('../smsGateway', () => ({
  isConfigured: jest.fn(() => true),
  sendSms: jest.fn(),
  getSmsState: jest.fn(),
}));

const repository = require('../../repositories/sms.repository');
const templatesRepository = require('../../repositories/smsTemplates.repository');
const gateway = require('../smsGateway');
const service = require('../sms.service');

// 10:00 and 23:00 in Tashkent (UTC+5).
const MORNING = new Date('2026-10-13T05:00:00Z');
const NIGHT = new Date('2026-10-13T18:00:00Z');
const admin = { id: 2, userType: 'superuser', username: 'admin' };

const paymentRow = (overrides = {}) => ({
  student_id: 10, center_id: 1, center_name: 'Temurbek', class_id: 3, class_name: 'IELTS B-12', first_name: 'Ali', last_name: 'Valiyev',
  parent_phone: '90 123-45-67', phone: null, paid_amount: 0, expected: 300000, ...overrides,
});

const student = (overrides = {}) => ({
  student_id: 10, first_name: 'Ali', last_name: 'Valiyev', class_id: 3, class_name: 'IELTS B-12', center_id: 1,
  center_name: 'Temurbek', parent_phone: '+998 90 123 45 67', phone: null, status: 'Active', is_frozen: false, ...overrides,
});
const mark = (studentId, day, status) => ({ student_id: studentId, class_id: 3, attendance_date: day, status });

describe('sms service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    gateway.isConfigured.mockReturnValue(true);
    delete process.env.SMS_DAILY_LIMIT;
  });

  it('reads Uzbek numbers in any common form', () => {
    expect(service.normalizePhone('90 123-45-67')).toBe('+998901234567');
    expect(service.normalizePhone('+998 (90) 123 45 67')).toBe('+998901234567');
    expect(service.normalizePhone('998901234567')).toBe('+998901234567');
    expect(service.normalizePhone('12345')).toBeNull();
  });

  it('keeps texts plain so one SMS holds 160 characters', () => {
    expect(service.plainText('<b>Oʻgʻil</b> — “ok”')).toBe('O\'g\'il - "ok"');
  });

  it('names a whole month, else the dates', () => {
    expect(service.periodLabel('2026-10-01', '2026-10-31')).toBe('oktyabr oyi');
    expect(service.periodLabel('2026-10-01', '2026-10-15')).toBe('01.10-15.10 davri');
  });

  it('tells parents a payment is waiting, with what is still owed, once a day', async () => {
    repository.findPaymentFigures.mockResolvedValue([
      paymentRow(),
      paymentRow({ student_id: 11, paid_amount: 300000 }),
      paymentRow({ student_id: 12, parent_phone: null, phone: null }),
      paymentRow({ student_id: 13, parent_phone: null, phone: '93 000 00 00', first_name: 'Bek' }),
    ]);
    const out = await service.sendPaymentSms({ type: 'waiting', studentIds: [10, 11, 12, 13, 14], from: '2026-10-01', to: '2026-10-31', centerId: 1, actingUser: admin, senderName: 'Admin Aka' });

    expect(repository.findPaymentFigures).toHaveBeenCalledWith({ studentIds: [10, 11, 12, 13, 14], centerId: 1, from: '2026-10-01', to: '2026-10-31', months: 1 });
    // 11 owes nothing, 14 is not on the list: not applicable. 12 has no number.
    expect(out).toMatchObject({ queued: 2, already_sent: 0, no_phone: 1, not_applicable: 2, daily_limit: 30 });
    const [[rows]] = repository.enqueue.mock.calls;
    expect(rows[0]).toMatchObject({ kind: 'payment_waiting', phone: '+998901234567', studentId: 10, classId: 3, centerId: 1, createdByType: 'superuser', senderName: 'Admin Aka' });
    expect(rows[0].text).toBe("Hurmatli ota-ona! Ali Valiyev (IELTS B-12) uchun oktyabr oyi to'lovi kutilmoqda: 300 000 so'm. Iltimos, to'lovni o'z vaqtida qiling.\nTemurbek");
    expect(rows[0].dedupeKey).toMatch(/^payment_waiting:10:2026-10-01:2026-10-31:\d{4}-\d{2}-\d{2}$/);
    // The student's own number when there is no parent number.
    expect(rows[1].phone).toBe('+998930000000');
  });

  it('confirms a payment, mentioning what is left', async () => {
    repository.findPaymentFigures.mockResolvedValue([
      paymentRow({ paid_amount: 200000 }),
      paymentRow({ student_id: 11, paid_amount: 0 }),
    ]);
    repository.enqueue.mockResolvedValueOnce([]);
    const out = await service.sendPaymentSms({ type: 'success', studentIds: [10, 11], from: '2026-10-01', to: '2026-10-31', centerId: 1, actingUser: admin, senderName: null });
    const [[rows]] = repository.enqueue.mock.calls;
    expect(rows).toHaveLength(1);
    expect(rows[0].text).toBe("Hurmatli ota-ona! Ali Valiyev (IELTS B-12) uchun oktyabr oyi to'lovi qabul qilindi: 200 000 so'm. Qoldiq: 100 000 so'm. Rahmat!\nTemurbek");
    // Already sent today: nothing new queued.
    expect(out).toMatchObject({ queued: 0, already_sent: 1, not_applicable: 1 });
  });

  it('texts parents of students who missed two or more lessons in a row, once per run', async () => {
    repository.findAttendanceFacts.mockResolvedValue({
      records: [
        mark(10, '2026-10-09', 'Absent'), mark(10, '2026-10-07', 'Absent'), mark(10, '2026-10-05', 'Present'),
        mark(11, '2026-10-09', 'Absent'), mark(11, '2026-10-07', 'Absent'),
        mark(12, '2026-10-09', 'Absent'), mark(12, '2026-10-07', 'Present'),
        mark(13, '2026-10-09', 'Excused'), mark(13, '2026-10-07', 'Absent'),
        mark(14, '2026-10-09', 'Absent'), mark(14, '2026-10-07', 'Absent'),
      ],
      // An admin already dealt with 14's absences.
      resolutions: [{ student_id: 14, class_id: 3, resolved_through: '2026-10-09' }],
      students: [student(), student({ student_id: 11, parent_phone: null }), student({ student_id: 12 }), student({ student_id: 13 }), student({ student_id: 14 })],
    });
    const teacher = { id: 7, userType: 'teacher' };
    const items = [10, 11, 12, 13, 14, 99].map((id) => ({ student_id: id, class_id: 3 }));
    const out = await service.sendAttendanceSms({ items: [...items, items[0]], centerId: 1, teacherId: 7, actingUser: teacher, senderName: 'Ibrohim M' });

    expect(repository.findAttendanceFacts).toHaveBeenCalledWith({ studentIds: [10, 11, 12, 13, 14, 99], classIds: [3], centerId: 1, teacherId: 7 });
    // 12 missed once, 13 was excused last time, 14 is dealt with, 99 is not in the group.
    expect(out).toMatchObject({ queued: 1, no_phone: 1, not_applicable: 4 });
    const [[[row]]] = repository.enqueue.mock.calls;
    expect(row).toMatchObject({ kind: 'attendance', dedupeKey: 'attendance:3:10:2026-10-09', createdByType: 'teacher', senderName: 'Ibrohim M' });
    expect(row.text).toBe('Hurmatli ota-ona! Farzandingiz Ali Valiyev IELTS B-12 guruhidagi oxirgi 2 ta darsga kelmadi (07.10, 09.10). Iltimos, sababini markazga xabar bering.\nTemurbek');
  });

  it("uses the owner's active template, filling in the placeholders", async () => {
    templatesRepository.findActiveBodies.mockResolvedValueOnce({ payment_waiting: "Salom! {ism}, {guruh}: {oy} uchun {qoldiq} (jami {kutilgan}). {markaz}" });
    repository.findPaymentFigures.mockResolvedValue([paymentRow({ paid_amount: 100000 })]);
    await service.sendPaymentSms({ type: 'waiting', studentIds: [10], from: '2026-10-01', to: '2026-10-31', centerId: 1, actingUser: admin, senderName: null });
    expect(repository.enqueue.mock.calls[0][0][0].text).toBe("Salom! Ali Valiyev, IELTS B-12: oktyabr oyi uchun 200 000 so'm (jami 300 000 so'm). Temurbek");

    templatesRepository.findActiveBodies.mockResolvedValueOnce({ attendance: 'Ota-ona! {ism} {soni} ta dars qoldirdi: {sanalar}.' });
    repository.findAttendanceFacts.mockResolvedValue({
      records: [mark(10, '2026-10-09', 'Absent'), mark(10, '2026-10-07', 'Absent')],
      resolutions: [],
      students: [student()],
    });
    await service.sendAttendanceSms({ items: [{ student_id: 10, class_id: 3 }], actingUser: admin, senderName: null });
    expect(repository.enqueue.mock.calls[1][0][0].text).toBe('Ota-ona! Ali Valiyev 2 ta dars qoldirdi: 07.10, 09.10.');
  });

  it('falls back to the built-in text when the templates cannot be read', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    templatesRepository.findActiveBodies.mockRejectedValueOnce(new Error('db down'));
    repository.findPaymentFigures.mockResolvedValue([paymentRow()]);
    await service.sendPaymentSms({ type: 'waiting', studentIds: [10], from: '2026-10-01', to: '2026-10-31', centerId: 1, actingUser: admin, senderName: null });
    expect(repository.enqueue.mock.calls[0][0][0].text).toMatch(/^Hurmatli ota-ona! Ali Valiyev \(IELTS B-12\) uchun/);
  });

  it('skips a student who moved group or is frozen', async () => {
    repository.findAttendanceFacts.mockResolvedValue({
      records: [mark(10, '2026-10-09', 'Absent'), mark(10, '2026-10-07', 'Absent'), mark(11, '2026-10-09', 'Absent'), mark(11, '2026-10-07', 'Absent')],
      resolutions: [],
      students: [student({ class_id: 4 }), student({ student_id: 11, is_frozen: true })],
    });
    const out = await service.sendAttendanceSms({ items: [{ student_id: 10, class_id: 3 }, { student_id: 11, class_id: 3 }], actingUser: admin, senderName: null });
    expect(out).toMatchObject({ queued: 0, not_applicable: 2 });
  });

  it('lists who was already texted, for the warnings page', async () => {
    repository.findAttendanceSent.mockResolvedValue([{ dedupe_key: 'attendance:3:10:2026-10-09', created_at: '2026-10-10T05:00:00Z' }]);
    expect(await service.listAttendanceSent(1)).toEqual([{ key: '3:10:2026-10-09', sent_at: '2026-10-10T05:00:00Z' }]);
    expect(repository.findAttendanceSent).toHaveBeenCalledWith(1);
  });

  it('sends nothing while no phone is connected', async () => {
    gateway.isConfigured.mockReturnValue(false);
    expect(await service.sendPaymentSms({ type: 'waiting', studentIds: [10], actingUser: admin, senderName: null })).toEqual({ error: 'not_configured' });
    expect(await service.sendAttendanceSms({ items: [{ student_id: 10, class_id: 3 }], actingUser: admin, senderName: null })).toEqual({ error: 'not_configured' });
    expect(repository.findPaymentFigures).not.toHaveBeenCalled();
  });

  it('turns the owner page filters into a query', async () => {
    repository.findMessages.mockResolvedValue({ total: 3, by_status: { delivered: 3 }, rows: [] });
    const out = await service.listMessages({ kind: 'payment', status: 'delivered', sender_type: 'teacher', from: '2026-10-01', to: 'bad', q: ' Ali ', page: '2', center_id: '1' });
    expect(repository.findMessages).toHaveBeenCalledWith({
      centerId: 1, from: '2026-10-01', to: undefined, kinds: ['payment_success', 'payment_waiting'], status: 'delivered',
      senderType: 'teacher', q: 'Ali', limit: 50, offset: 50,
    });
    expect(out).toMatchObject({ page: 2, total: 3, by_status: { delivered: 3 } });
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
    repository.countSentToday.mockResolvedValue(0);
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

  it('refuses a test SMS to a bad number', async () => {
    expect(await service.sendTest('123', 1, admin, null)).toEqual({ error: 'invalid_phone' });
  });
});
