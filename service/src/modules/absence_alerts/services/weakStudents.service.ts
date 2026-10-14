const weakStudentsRepository = require('../repositories/weakStudents.repository');
const settingsService = require('../../settings/services/settings.service');

/** Two or more lessons in a month with homework done halfway or worse makes a student weak. */
const WEAK_LESSONS = 2;

const centerMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

const monthBounds = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  const next = value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
  return { monthStart: `${month}-01`, monthEnd: `${next}-01` };
};

const maxScore = (options: unknown) =>
  Math.max(0, ...(Array.isArray(options) ? options : []).map((option: any) => Number(option?.score) || 0));

/**
 * Students who, in lessons they came to, got half the homework score or less ("Half", "Weak",
 * "None" by default) at least twice this month, per group. An absent lesson (0 for attendance) is
 * the absence alerts' job and is not counted here.
 */
const findWeakStudents = (rows: any[], maxHomeworkByCenter: Map<number, number>) => {
  const byStudentClass = new Map<string, any>();
  rows.forEach((row) => {
    const attendance = row.attendance_score === null || row.attendance_score === undefined ? null : Number(row.attendance_score);
    if (attendance === 0) return;
    const maxHomework = maxHomeworkByCenter.get(Number(row.center_id)) || 0;
    if (maxHomework <= 0 || Number(row.homework_score) > maxHomework / 2) return;
    const key = `${row.student_id}:${row.class_id}`;
    const entry = byStudentClass.get(key) || {
      student_id: Number(row.student_id),
      student_name: [row.last_name, row.first_name].filter(Boolean).join(' ').trim() || `#${row.student_id}`,
      phone: row.phone || null,
      parent_name: row.parent_name || null,
      parent_phone: row.parent_phone || null,
      class_id: Number(row.class_id),
      class_name: row.class_name || null,
      center_id: Number(row.center_id),
      teacher_id: row.teacher_id ?? null,
      teacher_name: row.teacher_name || null,
      lessons: [] as Array<{ date: string; homework_score: number }>,
    };
    entry.lessons.push({ date: String(row.session_date).slice(0, 10), homework_score: Number(row.homework_score) });
    byStudentClass.set(key, entry);
  });
  return Array.from(byStudentClass.values())
    .filter((entry) => entry.lessons.length >= WEAK_LESSONS)
    .map((entry) => ({ ...entry, lessons: entry.lessons.sort((a: any, b: any) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.lessons.length - a.lessons.length || a.student_name.localeCompare(b.student_name));
};

const listWeakStudents = async ({ centerId, teacherId }: { centerId?: number; teacherId?: number }, now?: Date) => {
  const month = centerMonth(now);
  const rows = await weakStudentsRepository.findMonthHomework({ centerId, teacherId, ...monthBounds(month) });
  // Each center sets its own homework scale in Settings.
  const centerIds = Array.from(new Set(rows.map((row: any) => Number(row.center_id)))) as number[];
  const maxHomeworkByCenter = new Map<number, number>();
  await Promise.all(centerIds.map(async (id) => {
    maxHomeworkByCenter.set(id, maxScore((await settingsService.getLessonScoring(id))?.homework));
  }));
  return { month, students: findWeakStudents(rows, maxHomeworkByCenter) };
};

module.exports = { listWeakStudents, findWeakStudents, WEAK_LESSONS };
export {};
