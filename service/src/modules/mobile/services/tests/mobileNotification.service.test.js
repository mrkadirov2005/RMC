jest.mock('../../repositories/mobileNotification.repository', () => ({
  enqueue: jest.fn(),
  isCategoryEnabled: jest.fn(),
  listPrefs: jest.fn(),
  setPref: jest.fn(),
  listInbox: jest.fn(),
  markRead: jest.fn(),
  setPushToken: jest.fn(),
  pushTokensFor: jest.fn(),
  clearPushToken: jest.fn(),
  dueMessages: jest.fn(),
  markDelivered: jest.fn(),
  markRetry: jest.fn(),
  getCheckpoint: jest.fn(),
  setCheckpoint: jest.fn(),
  newEvents: jest.fn(),
  sourceMaxId: jest.fn(),
  parentsOf: jest.fn(),
}));

const repo = require('../../repositories/mobileNotification.repository');
const service = require('../mobileNotification.service');

const student = { userType: 'student', userId: 7 };
const parent = { userType: 'parent', userId: 11 };
const event = { id: 50, student_id: 8, main_id: 7, first_name: 'Aziza', class_name: 'B1' };

describe('mobile notification service', () => {
  beforeEach(() => {
    repo.isCategoryEnabled.mockResolvedValue(true);
    repo.enqueue.mockResolvedValue(1);
  });

  // @MOB-042
  describe('messageFor', () => {
    it('tells parents about attendance, not the student', () => {
      expect(service.messageFor('attendance', { ...event, status: 'Absent NR' }, parent)).toEqual({
        category: 'attendance',
        title: 'Davomat',
        body: 'Aziza darsga kelmadi (B1).',
        url: '/attendance?child=7',
      });
      expect(service.messageFor('attendance', { ...event, status: 'Late' }, parent).body).toBe('Aziza darsga kechikib keldi (B1).');
      expect(service.messageFor('attendance', { ...event, status: 'Present' }, student)).toBeNull();
      expect(service.messageFor('attendance', { ...event, status: 'Unknown' }, parent)).toBeNull();
    });

    it('sends grades to both, naming the child only for parents', () => {
      expect(service.messageFor('grades', { ...event, value: '86.4' }, student).body).toBe('86% (B1).');
      expect(service.messageFor('grades', { ...event, value: 86 }, parent)).toMatchObject({ body: 'Aziza: 86% (B1).', url: '/results?child=7' });
      expect(service.messageFor('grades', { ...event, value: null }, parent)).toBeNull();
    });

    it('sends coin awards to the student only, and never zero or negative ones', () => {
      expect(service.messageFor('coins', { ...event, value: 5, reason: 'Uy vazifasi' }, student).body).toBe('+5 coin: Uy vazifasi');
      expect(service.messageFor('coins', { ...event, value: 0 }, student)).toBeNull();
      expect(service.messageFor('coins', { ...event, value: 5 }, parent)).toBeNull();
    });

    it('sends payments to parents with the amount', () => {
      expect(service.messageFor('payments', { ...event, value: '480000' }, parent).body).toBe("Aziza: 480 000 so'm.");
      expect(service.messageFor('payments', { ...event, value: 1 }, student)).toBeNull();
      expect(service.messageFor('other', event, parent)).toBeNull();
    });
  });

  // @MOB-043
  it('notify skips muted categories', async () => {
    repo.isCategoryEnabled.mockResolvedValueOnce(false);
    await expect(service.notify(parent, { category: 'grades', title: 't', body: 'b', url: '/x' }, 'k')).resolves.toBeNull();
    expect(repo.enqueue).not.toHaveBeenCalled();

    await service.notify(parent, { category: 'grades', title: 't', body: 'b', url: '/x' }, 'k2');
    expect(repo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userType: 'parent', userId: 11, data: { url: '/x' }, dedupeKey: 'k2' }));
  });

  // @MOB-042
  describe('scanSource', () => {
    it('starts at the newest row the first time, sending nothing old', async () => {
      repo.getCheckpoint.mockResolvedValue(null);
      repo.sourceMaxId.mockResolvedValue(900);

      await expect(service.scanSource('attendance')).resolves.toBe(0);
      expect(repo.setCheckpoint).toHaveBeenCalledWith('mobile_push:attendance', 900);
      expect(repo.newEvents).not.toHaveBeenCalled();
    });

    it('queues one message per recipient and moves the checkpoint', async () => {
      repo.getCheckpoint.mockResolvedValue(40);
      repo.newEvents.mockResolvedValue([{ ...event, value: 90 }, { ...event, id: 51, value: 70 }]);
      repo.parentsOf.mockResolvedValue([11, 12]);

      await expect(service.scanSource('grades')).resolves.toBe(6);
      expect(repo.parentsOf).toHaveBeenCalledWith([8, 7]);
      expect(repo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'grades:50:student:7' }));
      expect(repo.enqueue).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'grades:51:parent:12' }));
      expect(repo.setCheckpoint).toHaveBeenCalledWith('mobile_push:grades', 51);
    });

    it('scanAll covers every source', async () => {
      repo.getCheckpoint.mockResolvedValue(1);
      repo.newEvents.mockResolvedValue([]);
      await service.scanAll();
      expect(repo.newEvents.mock.calls.map((c) => c[0])).toEqual(['attendance', 'grades', 'coins', 'payments']);
      expect(repo.setCheckpoint).not.toHaveBeenCalled();
    });
  });

  // @MOB-041
  describe('deliverDue', () => {
    const message = { outbox_id: 3, user_type: 'parent', user_id: 11, title: 'Davomat', body: 'b', data: { url: '/attendance' }, attempts: 0 };
    const reply = (status, body) => jest.fn(async () => ({ ok: status === 200, status, json: async () => body }));

    it('marks a message without devices as no_device', async () => {
      repo.dueMessages.mockResolvedValue([message]);
      repo.pushTokensFor.mockResolvedValue([]);
      const fetchFn = jest.fn();

      await service.deliverDue(fetchFn);

      expect(fetchFn).not.toHaveBeenCalled();
      expect(repo.markDelivered).toHaveBeenCalledWith(3, 'no_device');
    });

    it('pushes to every device and drops tokens Expo no longer knows', async () => {
      repo.dueMessages.mockResolvedValue([message]);
      repo.pushTokensFor.mockResolvedValue([{ push_token: 'ExponentPushToken[a]' }, { push_token: 'ExponentPushToken[b]' }]);
      const fetchFn = reply(200, { data: [{ status: 'ok' }, { status: 'error', details: { error: 'DeviceNotRegistered' } }] });

      await expect(service.deliverDue(fetchFn)).resolves.toBe(1);

      const sentBody = JSON.parse(fetchFn.mock.calls[0][1].body);
      expect(sentBody.map((m) => m.to)).toEqual(['ExponentPushToken[a]', 'ExponentPushToken[b]']);
      expect(sentBody[0]).toMatchObject({ title: 'Davomat', data: { url: '/attendance' } });
      expect(repo.clearPushToken).toHaveBeenCalledWith('ExponentPushToken[b]');
      expect(repo.markDelivered).toHaveBeenCalledWith(3, 'sent');
    });

    it('retries with backoff and gives up after five attempts', async () => {
      repo.pushTokensFor.mockResolvedValue([{ push_token: 'ExponentPushToken[a]' }]);
      repo.dueMessages.mockResolvedValueOnce([message]);
      await service.deliverDue(reply(500, {}));
      expect(repo.markRetry).toHaveBeenLastCalledWith(3, 'Expo push HTTP 500', 60, false);

      repo.dueMessages.mockResolvedValueOnce([{ ...message, attempts: 4 }]);
      await service.deliverDue(reply(200, { data: [{ status: 'error', message: 'bad' }] }));
      expect(repo.markRetry).toHaveBeenLastCalledWith(3, 'bad', 960, true);
    });
  });

  // @MOB-040
  it('saves a push token only for a mobile session', async () => {
    await expect(service.savePushToken({ id: 7, userType: 'student' }, 'x')).resolves.toBe(false);
    repo.setPushToken.mockResolvedValue([{ session_id: 2 }]);
    await expect(service.savePushToken({ id: 7, userType: 'student', sid: 2 }, 'ExponentPushToken[a]')).resolves.toBe(true);
    expect(repo.setPushToken).toHaveBeenCalledWith(2, 'student', 7, 'ExponentPushToken[a]');
  });

  // @MOB-043
  it('inbox pages and preferences list every category', async () => {
    repo.listInbox.mockResolvedValue({ rows: [{ notification_id: 1 }], total: 3, unread: 2 });
    await expect(service.inbox({ userType: 'parent', id: 11 }, 2, 1)).resolves.toEqual({ items: [{ notification_id: 1 }], page: 2, page_size: 1, total: 3, unread: 2 });
    expect(repo.listInbox).toHaveBeenCalledWith('parent', 11, 1, 1);

    repo.listPrefs.mockResolvedValue([{ category: 'coins', enabled: false }]);
    const prefs = await service.preferences({ userType: 'student', id: 7 });
    expect(prefs.items).toContainEqual({ category: 'coins', enabled: false });
    expect(prefs.items).toContainEqual({ category: 'grades', enabled: true });

    await expect(service.setPreference({ userType: 'student', id: 7 }, 'nope', true)).resolves.toBe(false);
    await expect(service.setPreference({ userType: 'student', id: 7 }, 'coins', true)).resolves.toBe(true);
    await service.markRead({ userType: 'student', id: 7 });
    expect(repo.markRead).toHaveBeenCalledWith('student', 7, undefined);
  });

  it('the worker can be switched off', () => {
    process.env.MOBILE_PUSH_WORKER = 'off';
    jest.spyOn(console, 'log').mockImplementation(() => {});
    expect(service.startPushWorker()).toBeNull();
    delete process.env.MOBILE_PUSH_WORKER;
    const timer = service.startPushWorker();
    expect(timer).toBeTruthy();
    clearInterval(timer);
  });
});
