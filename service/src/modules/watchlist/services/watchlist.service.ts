const watchlistRepository = require('../repositories/watchlist.repository');
const telegramRepository = require('../../telegram/repositories/telegram.repository');
const { computeStandings } = require('../../telegram/services/standings');
const { combineLessonScore } = require('../../grades/services/lessonScore');

const centerMonth = (now = new Date()) => {
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [year, month] = day.slice(0, 7).split('-').map(Number);
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { monthStart: `${day.slice(0, 7)}-01`, monthEnd: next };
};

/**
 * This month's study rating, the same one parents get from the bot: place in the group and in
 * the center by summed lesson scores, plus the average lesson score.
 */
const rate = (monthRows: any[], row: any) => {
  const mainId = Number(row.main_student_id);
  const standing = computeStandings(monthRows, Number(row.class_id), mainId);
  const own = monthRows.filter((lesson) => Number(lesson.main_student_id) === mainId);
  return {
    group_place: standing.groupPlace,
    group_size: standing.groupSize,
    center_place: standing.centerPlace,
    lessons_scored: own.length,
    average_score: own.length ? Math.round(own.reduce((sum, lesson) => sum + combineLessonScore(lesson), 0) / own.length) : null,
  };
};

const list = async (centerId?: number, now?: Date) => {
  const rows = await watchlistRepository.findActive(centerId);
  const month = centerMonth(now);
  // The owner may see several branches; each is ranked against its own students.
  const centers = Array.from(new Set<number>(rows.map((row: any) => Number(row.center_id))));
  const scoresByCenter = new Map<number, any[]>();
  await Promise.all(centers.map(async (id) => scoresByCenter.set(id, await telegramRepository.findMonthScores({ centerId: id, ...month }))));
  return rows.map((row: any) => ({ ...row, rating: rate(scoresByCenter.get(Number(row.center_id)) || [], row) }));
};

const cleanText = (value: unknown, max: number) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

const add = async (body: any, centerId: number | undefined, addedByName: string | null) => {
  const studentId = Number(body?.student_id);
  const contactName = cleanText(body?.contact_name, 255);
  if (!Number.isInteger(studentId) || studentId <= 0) return { error: 'invalid_student' as const };
  if (!contactName) return { error: 'contact_required' as const };
  const studentCenter = await watchlistRepository.findStudentCenter(studentId, centerId);
  if (!studentCenter) return { error: 'student_not_found' as const };
  const row = await watchlistRepository.insert({
    centerId: Number(studentCenter),
    studentId,
    contactName,
    contactPhone: cleanText(body?.contact_phone, 50),
    note: cleanText(body?.note, 1000),
    addedByName,
  });
  return row ? { row } : { error: 'already_watched' as const };
};

const update = async (watchId: number, body: any, centerId?: number) => {
  const contactName = cleanText(body?.contact_name, 255);
  if (!contactName) return { error: 'contact_required' as const };
  const updated = await watchlistRepository.update(watchId, { contactName, contactPhone: cleanText(body?.contact_phone, 50), note: cleanText(body?.note, 1000) }, centerId);
  return updated ? { ok: true } : { error: 'not_found' as const };
};

const remove = (watchId: number, centerId?: number) => watchlistRepository.softRemove(watchId, centerId);

module.exports = { list, add, update, remove, centerMonth };
export {};
