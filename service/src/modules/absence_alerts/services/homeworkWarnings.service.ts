const homeworkWarningsRepository = require('../repositories/homeworkWarnings.repository');
const settingsService = require('../../settings/services/settings.service');

/** Two or more lessons in a month with homework not done or done partly makes a warning. */
const WARNING_LESSONS = 2;

const centerMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

const monthBounds = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  const next = value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
  return { monthStart: `${month}-01`, monthEnd: `${next}-01` };
};

type HomeworkScale = { max: number; labels: Map<number, string> };

const toScale = (options: unknown): HomeworkScale => {
  const list = Array.isArray(options) ? options : [];
  return {
    max: Math.max(0, ...list.map((option: any) => Number(option?.score) || 0)),
    labels: new Map(list.map((option: any) => [Number(option?.score) || 0, String(option?.label || '')])),
  };
};

/**
 * Students who, in lessons they came to, had homework not done or done partly (half the homework
 * score or less: "Half", "Weak", "None" by default) at least twice this month, per group. Each
 * lesson keeps its homework label so the teacher can filter by it. An absent lesson (0 for
 * attendance) is the absence alerts' job and is not counted here.
 */
const findHomeworkWarnings = (rows: any[], scaleByCenter: Map<number, HomeworkScale>) => {
  const byStudentClass = new Map<string, any>();
  rows.forEach((row) => {
    const attendance = row.attendance_score === null || row.attendance_score === undefined ? null : Number(row.attendance_score);
    if (attendance === 0) return;
    const scale = scaleByCenter.get(Number(row.center_id));
    const score = Number(row.homework_score);
    if (!scale || scale.max <= 0 || score > scale.max / 2) return;
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
      lessons: [] as Array<{ date: string; homework_score: number; homework_label: string | null }>,
    };
    entry.lessons.push({ date: String(row.session_date).slice(0, 10), homework_score: score, homework_label: scale.labels.get(score) || null });
    byStudentClass.set(key, entry);
  });
  return Array.from(byStudentClass.values())
    .filter((entry) => entry.lessons.length >= WARNING_LESSONS)
    .map((entry) => ({ ...entry, lessons: entry.lessons.sort((a: any, b: any) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => b.lessons.length - a.lessons.length || a.student_name.localeCompare(b.student_name));
};

const listHomeworkWarnings = async ({ centerId, teacherId }: { centerId?: number; teacherId?: number }, now?: Date) => {
  const month = centerMonth(now);
  const rows = await homeworkWarningsRepository.findMonthHomework({ centerId, teacherId, ...monthBounds(month) });
  // Each center sets its own homework scale and labels in Settings.
  const centerIds = Array.from(new Set(rows.map((row: any) => Number(row.center_id)))) as number[];
  const scaleByCenter = new Map<number, HomeworkScale>();
  await Promise.all(centerIds.map(async (id) => {
    scaleByCenter.set(id, toScale((await settingsService.getLessonScoring(id))?.homework));
  }));
  return { month, students: findHomeworkWarnings(rows, scaleByCenter) };
};

module.exports = { listHomeworkWarnings, findHomeworkWarnings, WARNING_LESSONS };
export {};
