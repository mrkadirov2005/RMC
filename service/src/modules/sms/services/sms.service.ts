// SMS to parents who have not joined the Telegram bot: a missed lesson, a payment reminder and a
// teacher's message. Sent through the center's own SIM card (see smsGateway), so a daily limit,
// quiet hours and an expiry keep it from sending too much, at night, or too late to matter.
const smsRepository = require('../repositories/sms.repository');
const smsGateway = require('./smsGateway');
const settingsRepository = require('../../settings/repositories/settings.repository');

const SETTINGS_KEY = 'sms_settings';
const KINDS = ['absence', 'payment_reminder', 'teacher_feedback'] as const;
type SmsKind = typeof KINDS[number];
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const MAX_ATTEMPTS = 5;
const WORKER_INTERVAL_MS = 30000;
const HOUR_MS = 60 * 60 * 1000;

const dailyLimit = () => Math.max(0, Number(process.env.SMS_DAILY_LIMIT || 30));
const sendFromHour = () => Number(process.env.SMS_SEND_FROM_HOUR || 8);
const sendToHour = () => Number(process.env.SMS_SEND_TO_HOUR || 21);

const tashkentHour = (date = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tashkent', hour: '2-digit', hourCycle: 'h23' }).format(date));
const tashkentDay = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
/** Noon in Tashkent (UTC+5, no daylight saving) `daysAhead` days after the given day. */
const tashkentNoon = (day: string, daysAhead: number) => {
  const date = new Date(`${day}T07:00:00Z`);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date;
};
const isSendingHour = (date = new Date()) => {
  const hour = tashkentHour(date);
  return hour >= sendFromHour() && hour < sendToHour();
};

/** An Uzbek number in +998XXXXXXXXX form, or null when it cannot be one. */
const normalizePhone = (value: unknown) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
};

// Plain Latin keeps a message at 160 characters per SMS: the ʻ/ʼ/curly quotes and emoji would turn
// it into Unicode, 70 per SMS.
const plainText = (value: unknown) =>
  String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[ʻʼ‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, '-')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

const fullName = (row: any) => plainText([row.first_name, row.last_name].filter(Boolean).join(' '));
const signature = (row: any) => (row.center_name ? `\n${plainText(row.center_name)}` : '');

const normalizeSettings = (value: any) =>
  Object.fromEntries(KINDS.map((kind) => [kind, value?.[kind] !== false])) as Record<SmsKind, boolean>;

const getSettings = async (centerId?: number) => normalizeSettings(await settingsRepository.getSetting(SETTINGS_KEY, centerId));

const saveSettings = async (value: unknown, centerId?: number) => {
  const settings = normalizeSettings(value);
  await settingsRepository.saveSetting(SETTINGS_KEY, settings, centerId);
  return settings;
};

/**
 * Queues one message per child to the parent's phone, for children whose parents are not on the
 * Telegram bot and whose center has this kind of SMS turned on.
 */
const queueForParents = async ({
  mainStudentIds,
  kind,
  buildText,
  dedupeKey,
  expiresAt,
  actingUser,
}: {
  mainStudentIds: number[];
  kind: SmsKind;
  buildText: (contact: any) => string;
  dedupeKey?: (contact: any) => string;
  expiresAt: Date;
  actingUser?: any;
}) => {
  if (!smsGateway.isConfigured() || mainStudentIds.length === 0) return 0;
  const contacts = await smsRepository.findParentContacts(Array.from(new Set(mainStudentIds)));
  const enabledByCenter = new Map<number, boolean>();
  const rows: any[] = [];
  for (const contact of contacts) {
    if (contact.parent_on_telegram) continue;
    const phone = normalizePhone(contact.parent_phone);
    if (!phone) continue;
    const centerId = Number(contact.center_id) || 0;
    if (!enabledByCenter.has(centerId)) enabledByCenter.set(centerId, (await getSettings(centerId || undefined))[kind]);
    if (!enabledByCenter.get(centerId)) continue;
    rows.push({
      centerId: centerId || null,
      studentId: Number(contact.main_student_id),
      kind,
      phone,
      text: plainText(buildText(contact)),
      dedupeKey: dedupeKey ? dedupeKey(contact) : null,
      expiresAt,
      createdById: Number(actingUser?.id) || null,
      createdByType: actingUser?.userType || null,
    });
  }
  return smsRepository.enqueue(rows);
};

const dayMonth = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;

/** "Your child missed today's lesson", for each student marked Absent in a saved lesson. */
const queueLessonAbsences = async (sessionId: number, rows: any[]) => {
  const absent = rows.filter((row) => String(row.attendance_status || '').toLowerCase() === 'absent');
  if (absent.length === 0) return 0;
  const byStudent = new Map(absent.map((row) => [Number(row.main_student_id), row]));
  const lessonDay = String(absent[0].session_date || '').slice(0, 10) || tashkentDay();
  // Still useful the next morning when the lesson ends after sending hours; stale after that.
  const expiresAt = tashkentNoon(lessonDay, 1);
  if (expiresAt.getTime() < Date.now()) return 0;
  return queueForParents({
    mainStudentIds: Array.from(byStudent.keys()),
    kind: 'absence',
    expiresAt,
    dedupeKey: (contact) => `absence:${sessionId}:${contact.main_student_id}`,
    buildText: (contact) => {
      const row: any = byStudent.get(Number(contact.main_student_id)) || {};
      const lesson = plainText(row.subject_name || row.class_name || '');
      return `Hurmatli ota-ona! Farzandingiz ${fullName(contact)} ${dayMonth(lessonDay)} kuni${lesson ? ` ${lesson}` : ''} darsiga kelmadi.${signature(contact)}`;
    },
  });
};

const queuePaymentReminders = async (mainStudentIds: number[], month: string, actingUser?: any) => {
  const monthName = UZ_MONTHS[Number(month.slice(5, 7)) - 1] || month;
  const today = tashkentDay();
  return queueForParents({
    mainStudentIds,
    kind: 'payment_reminder',
    actingUser,
    expiresAt: tashkentNoon(today, 2),
    // Once a day per child, however many times the button is pressed.
    dedupeKey: (contact) => `payment:${month}:${contact.main_student_id}:${today}`,
    buildText: (contact) =>
      `Hurmatli ota-ona! ${fullName(contact)} uchun ${monthName} oyi to'lovi hali qilinmagan. Iltimos, to'lovni o'z vaqtida qiling.${signature(contact)}`,
  });
};

const FEEDBACK_SMS_MAX = 300;

const queueTeacherFeedback = async (mainStudentId: number, text: string, senderName: string | null, actingUser?: any) => {
  const body = plainText(text);
  const short = body.length > FEEDBACK_SMS_MAX ? `${body.slice(0, FEEDBACK_SMS_MAX - 3)}...` : body;
  return queueForParents({
    mainStudentIds: [mainStudentId],
    kind: 'teacher_feedback',
    actingUser,
    expiresAt: tashkentNoon(tashkentDay(), 2),
    buildText: (contact) =>
      `Ustozdan xabar${senderName ? ` (${plainText(senderName)})` : ''} - ${fullName(contact)}:\n${short}${signature(contact)}`,
  });
};

/** A test message from the settings page, to check the phone is connected. */
const sendTest = async (phoneInput: unknown, centerId: number | undefined, actingUser: any) => {
  if (!smsGateway.isConfigured()) return { error: 'not_configured' };
  const phone = normalizePhone(phoneInput);
  if (!phone) return { error: 'invalid_phone' };
  await smsRepository.enqueue([{
    centerId: centerId ?? null,
    studentId: null,
    kind: 'test',
    phone,
    text: 'RMC: SMS ulanishi tekshiruvi. Bu xabar keldi - hammasi ishlayapti.',
    expiresAt: new Date(Date.now() + HOUR_MS),
    createdById: Number(actingUser?.id) || null,
    createdByType: actingUser?.userType || null,
  }]);
  return { queued: 1, phone, sending_now: isSendingHour() };
};

const getStatus = async () => {
  const [sentToday, queued] = await Promise.all([smsRepository.countSentToday(), smsRepository.countQueued()]);
  return {
    configured: smsGateway.isConfigured(),
    daily_limit: dailyLimit(),
    sent_today: sentToday,
    queued,
    send_from_hour: sendFromHour(),
    send_to_hour: sendToHour(),
  };
};

const listRecent = (centerId?: number) => smsRepository.findRecent(centerId);

/** One worker tick: hand due messages to the phone within today's limit, then collect reports. */
const deliverDue = async (now = new Date()) => {
  if (!smsGateway.isConfigured()) return { sent: 0 };
  let sent = 0;
  if (isSendingHour(now)) {
    const room = dailyLimit() - (await smsRepository.countSentToday());
    const due = await smsRepository.claimDue(Math.min(Math.max(room, 0), 10));
    for (const message of due) {
      const expires = message.expires_at ? new Date(message.expires_at).getTime() : now.getTime() + 6 * HOUR_MS;
      try {
        const result = await smsGateway.sendSms(message.phone, message.text, (expires - now.getTime()) / 1000);
        await smsRepository.markSent(message.sms_id, result.id);
        sent += 1;
      } catch (error: any) {
        const reason = String(error?.message || error).slice(0, 300);
        if (error?.transient && Number(message.attempts) < MAX_ATTEMPTS) {
          await smsRepository.markRetry(message.sms_id, reason, 2 ** Number(message.attempts));
        } else {
          await smsRepository.markFailed(message.sms_id, reason);
        }
      }
    }
  } else {
    // Outside sending hours only expire what is overdue.
    await smsRepository.claimDue(0);
  }

  for (const message of await smsRepository.findAwaitingReport(20)) {
    try {
      const report = await smsGateway.getSmsState(message.gateway_id);
      if (report.state === 'Delivered') await smsRepository.setStatus(message.sms_id, 'delivered', null);
      if (report.state === 'Failed' || report.state === 'Cancelled') await smsRepository.setStatus(message.sms_id, 'failed', report.error || report.state);
    } catch {
      break; // The gateway is unreachable; ask again next tick.
    }
  }
  return { sent };
};

const startSmsWorker = () => {
  if (!smsGateway.isConfigured()) {
    console.log('[sms] SMS_GATEWAY_USERNAME/PASSWORD not set; SMS is off.');
    return null;
  }
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await deliverDue();
    } catch (error: any) {
      console.error('[sms] delivery failed:', error?.message || error);
    } finally {
      running = false;
    }
  }, WORKER_INTERVAL_MS);
  timer.unref?.();
  console.log(`[sms] sending through SMS Gateway, up to ${dailyLimit()} a day.`);
  return timer;
};

module.exports = {
  KINDS,
  normalizePhone,
  plainText,
  isSendingHour,
  getSettings,
  saveSettings,
  queueLessonAbsences,
  queuePaymentReminders,
  queueTeacherFeedback,
  sendTest,
  getStatus,
  listRecent,
  deliverDue,
  startSmsWorker,
};

export {};
