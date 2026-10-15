const studentRankingRepository = require('../repositories/studentRanking.repository');
const { combineLessonScore } = require('../../grades/services/lessonScore');

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const centerMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

const monthBounds = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  const next = value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
  return { monthStart: `${month}-01`, monthEnd: `${next}-01` };
};

/**
 * Each child's lesson points for the month in each of their groups: the same sums the Telegram bot
 * ranks by, so the owner's full list and the bot's top five agree. Ranking by group, level or the
 * whole center is left to the caller.
 */
const studentRankings = async (query: { month?: unknown }, centerId?: number, now?: Date) => {
  const month = MONTH.test(String(query?.month || '')) ? String(query.month) : centerMonth(now);
  const rows = await studentRankingRepository.findMonthLessonScores({ centerId, ...monthBounds(month) });
  const byStudentClass = new Map<string, any>();
  rows.forEach((row: any) => {
    const key = `${row.student_id}:${row.class_id}`;
    const entry = byStudentClass.get(key) || {
      student_id: Number(row.student_id),
      name: [row.first_name, row.last_name].filter(Boolean).join(' ').trim() || `#${row.student_id}`,
      center_id: Number(row.center_id),
      class_id: Number(row.class_id),
      class_name: row.class_name,
      level: row.level === null || row.level === undefined ? null : Number(row.level),
      lessons: 0,
      score: 0,
    };
    entry.lessons += 1;
    entry.score += combineLessonScore(row);
    byStudentClass.set(key, entry);
  });
  return { month, rows: Array.from(byStudentClass.values()) };
};

module.exports = { studentRankings, monthBounds };
export {};
