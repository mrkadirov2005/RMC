// The platform side of the Telegram bot. The platform never talks to Telegram itself: it queues
// messages in telegram_outbox and the bot delivers them to every chat following that student.
const telegramRepository = require('../repositories/telegram.repository');
const settingsRepository = require('../../settings/repositories/settings.repository');
const settingsService = require('../../settings/services/settings.service');
const { combineLessonScore, lessonGrade } = require('../../grades/services/lessonScore');
const { buildLessonMessage } = require('./lessonMessage');
const { computeStandings } = require('./standings');

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const DEFAULT_REMARK = 'Daily Session Grading';
const MAX_TEXT = 1500;

const monthBounds = (day: string) => {
  const [year, month] = day.slice(0, 7).split('-').map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { monthStart: `${day.slice(0, 7)}-01`, monthEnd: next };
};

const labelFor = (options: Array<{ label: string; score: number }>, score: unknown) => {
  if (score === null || score === undefined || score === '') return null;
  const value = Number(score);
  const option = options.find((item) => Number(item.score) === value);
  return { label: option?.label || String(value), score: value };
};

/** Queues the result of a saved lesson for every student someone follows in Telegram. */
const enqueueLessonResults = async (sessionId: number) => {
  const rows = await telegramRepository.findSessionResults(sessionId);
  if (rows.length === 0) return 0;
  const linked = await telegramRepository.findLinkedStudentIds(rows.map((row: any) => Number(row.main_student_id)));
  const followed = rows.filter((row: any) => linked.has(Number(row.main_student_id)));
  if (followed.length === 0) return 0;

  const first = followed[0];
  const centerId = Number(first.center_id) || undefined;
  const scoring = await settingsService.getLessonScoring(centerId);
  const lessonDate = String(first.session_date || '').slice(0, 10);
  const monthRows = centerId && lessonDate ? await telegramRepository.findMonthScores({ centerId, ...monthBounds(lessonDate) }) : [];

  const messages = followed.map((row: any) => {
    const total = combineLessonScore(row);
    const reason = String(row.attendance_remarks || '').trim();
    const standing = computeStandings(monthRows, Number(row.class_id), Number(row.main_student_id));
    return {
      centerId: Number(row.center_id) || null,
      studentId: Number(row.main_student_id),
      kind: 'lesson_result',
      text: buildLessonMessage({
        studentName: [row.first_name, row.last_name].filter(Boolean).join(' '),
        className: row.class_name || 'Dars',
        lessonDate: row.session_date,
        attendanceStatus: row.attendance_status,
        attendanceScore: row.attendance_score != null ? Number(row.attendance_score) : null,
        reason: reason && reason !== DEFAULT_REMARK ? reason : null,
        homework: labelFor(scoring.homework, row.homework_score),
        activity: labelFor(scoring.activity, row.activity_score),
        pointsScore: row.points_score != null ? Number(row.points_score) : null,
        total,
        grade: lessonGrade(total),
        coinsDelta: row.coins_delta != null ? Number(row.coins_delta) : null,
        coinsBalance: row.coins_balance != null ? Number(row.coins_balance) : null,
        ...standing,
      }),
    };
  });
  return telegramRepository.enqueueMessages(messages);
};

const cleanText = (text: unknown) => String(text || '').trim().slice(0, MAX_TEXT);

/** A teacher's good or bad feedback about a student, to the student and their parents. */
const sendFeedback = async ({ studentId, text, actingUser, senderName }: { studentId: number; text: string; actingUser: any; senderName?: string | null }) => {
  const body = cleanText(text);
  if (!body) return { error: 'empty' };
  const student = await telegramRepository.findStudent(studentId);
  if (!student) return { error: 'not_found' };
  const linked = await telegramRepository.findLinkedStudentIds([Number(student.main_student_id)]);
  if (!linked.has(Number(student.main_student_id))) return { queued: 0, linked: false };
  const from = senderName ? ` (${senderName})` : '';
  await telegramRepository.enqueueMessages([{
    centerId: student.center_id ?? null,
    studentId: Number(student.main_student_id),
    kind: 'teacher_feedback',
    text: `💬 <b>Ustozdan xabar${from}</b>\n👤 ${student.first_name || ''} ${student.last_name || ''}\n\n${body.replace(/[<>&]/g, '')}`,
    createdById: Number(actingUser?.id) || null,
    createdByType: actingUser?.userType || null,
  }]);
  return { queued: 1, linked: true };
};

/** "Payment for <month> is not made yet" to the chosen students and their parents. */
const sendPaymentReminders = async ({ studentIds, month, actingUser }: { studentIds: number[]; month: string; actingUser: any }) => {
  const monthIndex = Number(String(month).slice(5, 7)) - 1;
  const monthName = UZ_MONTHS[monthIndex] || String(month);
  const students = (await Promise.all(studentIds.map((id) => telegramRepository.findStudent(id)))).filter(Boolean);
  const linked = await telegramRepository.findLinkedStudentIds(students.map((student: any) => Number(student.main_student_id)));
  const seen = new Set<number>();
  const messages = students
    .filter((student: any) => linked.has(Number(student.main_student_id)))
    .filter((student: any) => !seen.has(Number(student.main_student_id)) && seen.add(Number(student.main_student_id)))
    .map((student: any) => ({
      centerId: student.center_id ?? null,
      studentId: Number(student.main_student_id),
      kind: 'payment_reminder',
      text: `💳 <b>To'lov eslatmasi</b>\n👤 ${student.first_name || ''} ${student.last_name || ''}\n\n${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} oyi uchun to'lov hali amalga oshirilmagan. Iltimos, to'lovni o'z vaqtida qiling.`,
      createdById: Number(actingUser?.id) || null,
      createdByType: actingUser?.userType || null,
    }));
  await telegramRepository.enqueueMessages(messages);
  return { requested: studentIds.length, queued: messages.length };
};

// What the bot shows under "About the director", "Center rules" and "Prizes".
const BOT_CONTENT_KEY = 'bot_content';
const normalizeBotContent = (value: any) => ({
  about_director: String(value?.about_director || '').slice(0, 3000),
  rules: String(value?.rules || '').slice(0, 3000),
  prizes: (Array.isArray(value?.prizes) ? value.prizes : [])
    .map((prize: any) => ({ name: String(prize?.name || '').trim().slice(0, 120), coins: Math.max(0, Math.round(Number(prize?.coins) || 0)) }))
    .filter((prize: any) => prize.name)
    .slice(0, 50),
});

const getBotContent = async (centerId?: number) => normalizeBotContent(await settingsRepository.getSetting(BOT_CONTENT_KEY, centerId));

const saveBotContent = async (value: unknown, centerId?: number) => {
  const content = normalizeBotContent(value);
  await settingsRepository.saveSetting(BOT_CONTENT_KEY, content, centerId);
  return content;
};

const listInbox = (scope: { centerId?: number; teacherId?: number; kinds?: string[] }) => telegramRepository.findInbox(scope);
const markInboxRead = (inboxId: number, scope: { centerId?: number; teacherId?: number }) => telegramRepository.markInboxRead(inboxId, scope);
const getLinkStats = (centerId?: number) => telegramRepository.countLinks(centerId);

module.exports = {
  enqueueLessonResults,
  sendFeedback,
  sendPaymentReminders,
  getBotContent,
  saveBotContent,
  normalizeBotContent,
  listInbox,
  markInboxRead,
  getLinkStats,
};

export {};
