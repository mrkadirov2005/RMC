// SMS to parents, only ever sent by hand: an admin on the To'lovlar page ("payment received" or
// "payment waiting") and a teacher on the warnings page (missed two or more lessons in a row).
// They go from the center's own SIM (see smsGateway), so a daily limit, sending hours and an
// expiry keep it from sending too much, at night, or too late to matter.
// Self-contained: it reads what it needs with its own queries and never calls other modules.
const smsRepository = require('../repositories/sms.repository');
const smsGateway = require('./smsGateway');

const KINDS = ['payment_success', 'payment_waiting', 'attendance', 'test'] as const;
const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const MAX_ATTEMPTS = 5;
const MAX_RECIPIENTS = 300;
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

const money = (value: unknown) => `${Math.round(Number(value || 0)).toLocaleString('en-US').replace(/,/g, ' ')} so'm`;
const dayMonth = (day: string) => `${day.slice(8, 10)}.${day.slice(5, 7)}`;
const lastDayOfMonth = (day: string) =>
  new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0)).getUTCDate();

/** "oktyabr oyi" for one whole month, else the dates: "01.10-15.10 davri". */
const periodLabel = (from: string, to: string) => {
  const wholeMonth = from.slice(0, 7) === to.slice(0, 7) && from.slice(8) === '01' && Number(to.slice(8)) === lastDayOfMonth(to);
  if (wholeMonth) return `${UZ_MONTHS[Number(from.slice(5, 7)) - 1]} oyi`;
  return `${dayMonth(from)}-${dayMonth(to)} davri`;
};

const studentName = (row: any) => plainText([row.first_name, row.last_name].filter(Boolean).join(' ')) || plainText(row.student_name);
const signature = (centerName: unknown) => (centerName ? `\n${plainText(centerName)}` : '');
const recipientPhone = (row: any) => normalizePhone(row.parent_phone) || normalizePhone(row.phone);

const isDay = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

/** The period asked for (this month by default) and how many fee months it covers. */
const resolvePeriod = (fromInput?: unknown, toInput?: unknown) => {
  const today = tashkentDay();
  let from = isDay(fromInput) ? String(fromInput) : `${today.slice(0, 7)}-01`;
  let to = isDay(toInput) ? String(toInput) : `${today.slice(0, 7)}-${String(lastDayOfMonth(today)).padStart(2, '0')}`;
  if (from > to) [from, to] = [to, from];
  const months = (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 + (Number(to.slice(5, 7)) - Number(from.slice(5, 7))) + 1;
  return { from, to, months: Math.max(1, Math.min(36, months)) };
};

const MIN_ABSENCE_STREAK = 2;
const isUnexcusedAbsent = (status: unknown) => {
  const value = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return value === 'absent' || value === 'absent_nr';
};

/**
 * The run of unexcused absences a student has in a group up to its latest lesson (a group's
 * lessons are the days attendance was taken), or null when it is under two lessons, already dealt
 * with by an admin, or the student no longer studies in that group.
 */
const absenceRun = (
  facts: { records: any[]; resolutions: any[]; students: any[] },
  studentId: number,
  classId: number
) => {
  const student = facts.students.find((row) => Number(row.student_id) === studentId);
  if (!student || student.is_frozen || Number(student.class_id) !== classId) return null;
  if (String(student.status || 'Active').toLowerCase() !== 'active') return null;
  const groupRecords = facts.records.filter((row) => Number(row.class_id) === classId);
  const lessonDays = Array.from(new Set(groupRecords.map((row) => String(row.attendance_date).slice(0, 10)))).sort().reverse();
  const absentDays: string[] = [];
  for (const day of lessonDays) {
    const record = groupRecords.find((row) => Number(row.student_id) === studentId && String(row.attendance_date).slice(0, 10) === day);
    if (!record || !isUnexcusedAbsent(record.status)) break;
    absentDays.push(day);
  }
  if (absentDays.length < MIN_ABSENCE_STREAK) return null;
  const resolvedThrough = facts.resolutions
    .filter((row) => Number(row.student_id) === studentId && Number(row.class_id || 0) === classId)
    .map((row) => String(row.resolved_through || '').slice(0, 10))
    .sort()
    .pop() || '';
  if (resolvedThrough >= absentDays[0]) return null;
  return { student, absentDays, lastAbsentDay: absentDays[0] };
};

type Outcome = { queued: number; already_sent: number; no_phone: number; not_applicable: number };

/** Queues the messages and counts what happened, with today's standing against the daily limit. */
const queueAll = async (rows: any[], skipped: Omit<Outcome, 'queued' | 'already_sent'>) => {
  const added = await smsRepository.enqueue(rows);
  const [sentToday, queuedTotal] = await Promise.all([smsRepository.countSentToday(), smsRepository.countQueued()]);
  return {
    queued: added.length,
    already_sent: rows.length - added.length,
    ...skipped,
    daily_limit: dailyLimit(),
    sent_today: sentToday,
    waiting: queuedTotal,
    sending_now: isSendingHour(),
  };
};

const actor = (actingUser: any, senderName: string | null) => ({
  createdById: Number(actingUser?.id) || null,
  createdByType: actingUser?.userType || null,
  senderName: senderName || actingUser?.username || null,
});

/**
 * Admin, To'lovlar page: "payment received" (something was paid in the period) or "payment
 * waiting" (something is still owed). Amounts are worked out here, the same way the page does.
 */
const sendPaymentSms = async ({
  type,
  studentIds,
  from,
  to,
  centerId,
  actingUser,
  senderName,
}: {
  type: 'success' | 'waiting';
  studentIds: number[];
  from?: string;
  to?: string;
  centerId?: number;
  actingUser: any;
  senderName: string | null;
}) => {
  if (!smsGateway.isConfigured()) return { error: 'not_configured' };
  const ids = Array.from(new Set(studentIds)).slice(0, MAX_RECIPIENTS);
  const period = resolvePeriod(from, to);
  const rows = (await smsRepository.findPaymentFigures({ studentIds: ids, centerId, ...period }))
    .map((row: any) => ({ ...row, remaining: Math.max(0, row.expected - row.paid_amount) }));
  const today = tashkentDay();
  const label = periodLabel(period.from, period.to);
  const kind = type === 'success' ? 'payment_success' : 'payment_waiting';
  const skipped = { no_phone: 0, not_applicable: ids.length - rows.length };
  const queue: any[] = [];

  for (const row of rows) {
    const applies = type === 'success' ? row.paid_amount > 0 : row.remaining > 0;
    if (!applies) { skipped.not_applicable += 1; continue; }
    const phone = recipientPhone(row);
    if (!phone) { skipped.no_phone += 1; continue; }
    const who = `${studentName(row)}${row.class_name ? ` (${plainText(row.class_name)})` : ''}`;
    const text = type === 'success'
      ? `Hurmatli ota-ona! ${who} uchun ${label} to'lovi qabul qilindi: ${money(row.paid_amount)}.${row.remaining > 0 ? ` Qoldiq: ${money(row.remaining)}.` : ''} Rahmat!`
      : `Hurmatli ota-ona! ${who} uchun ${label} to'lovi kutilmoqda: ${money(row.remaining)}. Iltimos, to'lovni o'z vaqtida qiling.`;
    queue.push({
      centerId: Number(row.center_id) || centerId || null,
      studentId: Number(row.student_id),
      classId: Number(row.class_id) || null,
      kind,
      phone,
      text: plainText(`${text}${signature(row.center_name)}`),
      // Once a day per student, notice and period, however many times it is pressed.
      dedupeKey: `${kind}:${row.student_id}:${period.from}:${period.to}:${today}`,
      expiresAt: tashkentNoon(today, 2),
      ...actor(actingUser, senderName),
    });
  }
  return queueAll(queue, skipped);
};

const attendanceKey = (classId: number, studentId: number, lastAbsentDay: string) => `attendance:${classId}:${studentId}:${lastAbsentDay}`;

/**
 * Teacher (their own groups) or admin, warnings page: students who missed two or more lessons in a
 * row. Each is checked again here, and texted once per run of absences.
 */
const sendAttendanceSms = async ({
  items,
  centerId,
  teacherId,
  actingUser,
  senderName,
}: {
  items: Array<{ student_id: number; class_id: number }>;
  centerId?: number;
  teacherId?: number;
  actingUser: any;
  senderName: string | null;
}) => {
  if (!smsGateway.isConfigured()) return { error: 'not_configured' };
  const pairs = Array.from(new Map(items.slice(0, MAX_RECIPIENTS)
    .map((item) => [`${Number(item.class_id)}:${Number(item.student_id)}`, { studentId: Number(item.student_id), classId: Number(item.class_id) }])).values());
  const facts = await smsRepository.findAttendanceFacts({
    studentIds: pairs.map((pair) => pair.studentId),
    classIds: Array.from(new Set(pairs.map((pair) => pair.classId))),
    centerId,
    teacherId,
  });
  const today = tashkentDay();
  const skipped = { no_phone: 0, not_applicable: 0 };
  const queue: any[] = [];

  for (const pair of pairs) {
    const run = absenceRun(facts, pair.studentId, pair.classId);
    if (!run) { skipped.not_applicable += 1; continue; }
    const phone = recipientPhone(run.student);
    if (!phone) { skipped.no_phone += 1; continue; }
    const dates = run.absentDays.slice().reverse().map(dayMonth).join(', ');
    const group = run.student.class_name ? ` ${plainText(run.student.class_name)} guruhidagi` : '';
    queue.push({
      centerId: Number(run.student.center_id) || centerId || null,
      studentId: pair.studentId,
      classId: pair.classId,
      kind: 'attendance',
      phone,
      text: plainText(
        `Hurmatli ota-ona! Farzandingiz ${studentName(run.student)}${group} oxirgi ${run.absentDays.length} ta darsga kelmadi (${dates}). Iltimos, sababini markazga xabar bering.${signature(run.student.center_name)}`
      ),
      dedupeKey: attendanceKey(pair.classId, pair.studentId, run.lastAbsentDay),
      expiresAt: tashkentNoon(today, 2),
      ...actor(actingUser, senderName),
    });
  }
  return queueAll(queue, skipped);
};

/** Missed-lesson SMS already sent, as "class:student:last absent day" keys, for the warnings page. */
const listAttendanceSent = async (centerId?: number) =>
  (await smsRepository.findAttendanceSent(centerId)).map((row: any) => ({
    key: String(row.dedupe_key).replace(/^attendance:/, ''),
    sent_at: row.created_at,
  }));

/** A test message from the owner's SMS page, to check the phone is connected. */
const sendTest = async (phoneInput: unknown, centerId: number | undefined, actingUser: any, senderName: string | null) => {
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
    ...actor(actingUser, senderName),
  }]);
  return { queued: 1, phone, sending_now: isSendingHour() };
};

const senderNameOf = (user: any) => smsRepository.findSenderName(user);

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

const PAGE_SIZE = 50;
const STATUSES = ['queued', 'sending', 'sent', 'delivered', 'failed', 'expired'];

/** The owner's SMS page, 50 per page. */
const listMessages = async (query: any) => {
  const page = Math.max(1, Number(query.page) || 1);
  const kinds = String(query.kind || '') === 'payment'
    ? ['payment_success', 'payment_waiting']
    : (KINDS as readonly string[]).includes(String(query.kind)) ? [String(query.kind)] : undefined;
  const result = await smsRepository.findMessages({
    centerId: Number(query.center_id) || undefined,
    from: isDay(query.from) ? String(query.from) : undefined,
    to: isDay(query.to) ? String(query.to) : undefined,
    kinds,
    status: STATUSES.includes(String(query.status)) ? String(query.status) : undefined,
    senderType: ['superuser', 'teacher'].includes(String(query.sender_type)) ? String(query.sender_type) : undefined,
    q: String(query.q || '').trim().slice(0, 100) || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });
  return { page, limit: PAGE_SIZE, total: Number(result.total || 0), by_status: result.by_status || {}, rows: result.rows || [] };
};

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
  periodLabel,
  isSendingHour,
  sendPaymentSms,
  sendAttendanceSms,
  listAttendanceSent,
  sendTest,
  getStatus,
  senderNameOf,
  listMessages,
  deliverDue,
  startSmsWorker,
};

export {};
