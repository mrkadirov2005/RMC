const repo = require('../repositories/mobileNotification.repository');

const CATEGORIES = ['attendance', 'grades', 'coins', 'payments', 'announcements'] as const;
type Category = (typeof CATEGORIES)[number];

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const WORKER_INTERVAL_MS = Number(process.env.MOBILE_PUSH_INTERVAL_MS || 15000);
const BATCH = 100;
const MAX_ATTEMPTS = 5;
const WATCH_LIMIT = 500;

const money = (value: any) => `${Math.round(Number(value) || 0).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;

// @MOB-042 Uzbek message for each event, per recipient. Returns null when nobody should be told.
const attendanceText: Record<string, string> = {
  Present: 'darsga keldi',
  Late: 'darsga kechikib keldi',
  Excused: 'darsga sababli kelmadi',
};

type Recipient = { userType: 'student' | 'parent'; userId: number };
type Message = { category: Category; title: string; body: string; url: string };

const messageFor = (source: string, event: any, to: Recipient): Message | null => {
  const name = event.first_name || "Farzandingiz";
  const childQuery = to.userType === 'parent' ? `?child=${event.main_id}` : '';
  const group = event.class_name ? ` (${event.class_name})` : '';
  if (source === 'attendance') {
    if (to.userType !== 'parent') return null;
    const status = String(event.status || '');
    const text = attendanceText[status] || (status.startsWith('Absent') ? 'darsga kelmadi' : null);
    if (!text) return null;
    return { category: 'attendance', title: 'Davomat', body: `${name} ${text}${group}.`, url: `/attendance${childQuery}` };
  }
  if (source === 'grades') {
    if (event.value == null) return null;
    const who = to.userType === 'parent' ? `${name}: ` : '';
    return { category: 'grades', title: 'Yangi baho', body: `${who}${Math.round(Number(event.value))}%${group}.`, url: `/results${childQuery}` };
  }
  if (source === 'coins') {
    const delta = Number(event.value || 0);
    if (to.userType !== 'student' || delta <= 0) return null;
    return { category: 'coins', title: 'Coinlar', body: `+${delta} coin${event.reason ? `: ${event.reason}` : ''}`, url: '/coins' };
  }
  if (source === 'payments') {
    if (to.userType !== 'parent') return null;
    return { category: 'payments', title: "To'lov qabul qilindi", body: `${name}: ${money(event.value)}.`, url: `/payments${childQuery}` };
  }
  return null;
};

// @MOB-041 Queue one message, honouring the user's muted categories.
const notify = async (to: Recipient, message: Message, dedupeKey: string) => {
  if (!(await repo.isCategoryEnabled(to.userType, to.userId, message.category))) return null;
  return repo.enqueue({
    userType: to.userType,
    userId: to.userId,
    category: message.category,
    title: message.title,
    body: message.body,
    data: { url: message.url },
    dedupeKey,
  });
};

// @MOB-042 Reads new attendance, grades, coin and payment rows and queues messages for the
// student (their login record) and every linked parent. Existing services are not touched.
const scanSource = async (source: string) => {
  const name = `mobile_push:${source}`;
  const checkpoint = await repo.getCheckpoint(name);
  if (checkpoint == null) {
    await repo.setCheckpoint(name, await repo.sourceMaxId(source));
    return 0;
  }
  const events = await repo.newEvents(source, checkpoint, WATCH_LIMIT);
  let queued = 0;
  for (const event of events) {
    const parents = await repo.parentsOf([Number(event.student_id), Number(event.main_id)]);
    const recipients: Recipient[] = [
      { userType: 'student', userId: Number(event.main_id) },
      ...parents.map((id: number) => ({ userType: 'parent' as const, userId: id })),
    ];
    for (const to of recipients) {
      const message = messageFor(source, event, to);
      if (message && (await notify(to, message, `${source}:${event.id}:${to.userType}:${to.userId}`))) queued += 1;
    }
  }
  if (events.length) await repo.setCheckpoint(name, Number(events[events.length - 1].id));
  return queued;
};

const scanAll = async () => {
  let queued = 0;
  for (const source of ['attendance', 'grades', 'coins', 'payments']) queued += await scanSource(source);
  return queued;
};

// @MOB-041 Sends due messages through the Expo push service. Retries with backoff; a device
// Expo says is gone loses its token.
const deliverDue = async (fetchFn: typeof fetch = fetch) => {
  const due = await repo.dueMessages(BATCH);
  let sent = 0;
  for (const message of due) {
    const devices = await repo.pushTokensFor(message.user_type, message.user_id);
    if (!devices.length) {
      await repo.markDelivered(message.outbox_id, 'no_device');
      continue;
    }
    try {
      const response = await fetchFn(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(
          devices.map((d: any) => ({ to: d.push_token, title: message.title, body: message.body, data: message.data || {}, sound: 'default' })),
        ),
      });
      const body: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
      const tickets: any[] = Array.isArray(body?.data) ? body.data : [];
      await Promise.all(
        tickets.map((ticket, i) =>
          ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered' ? repo.clearPushToken(devices[i].push_token) : null,
        ),
      );
      if (tickets.some((ticket) => ticket?.status === 'ok')) {
        await repo.markDelivered(message.outbox_id, 'sent');
        sent += 1;
      } else {
        throw new Error(tickets[0]?.message || 'No device accepted the message');
      }
    } catch (error: any) {
      const attempts = Number(message.attempts || 0) + 1;
      await repo.markRetry(message.outbox_id, String(error?.message || error), Math.min(3600, 30 * 2 ** attempts), attempts >= MAX_ATTEMPTS);
    }
  }
  return sent;
};

// @MOB-041 Background loop, started with the server like the SMS worker. MOBILE_PUSH_WORKER=off
// disables it.
const startPushWorker = () => {
  if (String(process.env.MOBILE_PUSH_WORKER || '').toLowerCase() === 'off') {
    console.log('[push] MOBILE_PUSH_WORKER=off; mobile push is off.');
    return null;
  }
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await scanAll();
      await deliverDue();
    } catch (error: any) {
      console.error('[push] cycle failed:', error?.message || error);
    } finally {
      running = false;
    }
  }, WORKER_INTERVAL_MS);
  timer.unref?.();
  return timer;
};

// @MOB-040 Saves (or clears, with null) the push token of the requesting device.
const savePushToken = async (user: any, token: string | null) => {
  if (!user?.sid) return false;
  const rows = await repo.setPushToken(Number(user.sid), user.userType, Number(user.id), token);
  return rows.length > 0;
};

// @MOB-043 Inbox and preferences.
const inbox = async (user: any, page: number, pageSize: number) => {
  const { rows, total, unread } = await repo.listInbox(user.userType, Number(user.id), pageSize, (page - 1) * pageSize);
  return { items: rows, page, page_size: pageSize, total, unread };
};

const markRead = (user: any, notificationId?: number) => repo.markRead(user.userType, Number(user.id), notificationId);

const preferences = async (user: any) => {
  const rows = await repo.listPrefs(user.userType, Number(user.id));
  const off = new Set(rows.filter((r: any) => !r.enabled).map((r: any) => r.category));
  return { items: CATEGORIES.map((category) => ({ category, enabled: !off.has(category) })) };
};

const setPreference = async (user: any, category: string, enabled: boolean) => {
  if (!(CATEGORIES as readonly string[]).includes(category)) return false;
  await repo.setPref(user.userType, Number(user.id), category, enabled);
  return true;
};

module.exports = {
  CATEGORIES,
  messageFor,
  notify,
  scanSource,
  scanAll,
  deliverDue,
  startPushWorker,
  savePushToken,
  inbox,
  markRead,
  preferences,
  setPreference,
};

export {};
