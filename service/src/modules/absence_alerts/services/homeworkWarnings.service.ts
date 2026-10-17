const homeworkWarningsRepository = require('../repositories/homeworkWarnings.repository');
const settingsService = require('../../settings/services/settings.service');
const { combineLessonScore, lessonMaxScore } = require('../../grades/services/lessonScore');

/** Two or more flagged lessons in a month make a warning. */
const WARNING_LESSONS = 2;
/** A lesson below this share of its best possible total (a grade under 4) is flagged. */
const LOW_SCORE_PERCENT = 70;

const centerMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

const monthBounds = (month: string) => {
  const [year, value] = month.split('-').map(Number);
  const next = value === 12 ? `${year + 1}-01` : `${year}-${String(value + 1).padStart(2, '0')}`;
  return { monthStart: `${month}-01`, monthEnd: `${next}-01` };
};

type HomeworkScale = { max: number; labels: Map<number, string> };
type CenterScoring = { homework: HomeworkScale; settings: any };

const toScale = (options: unknown): HomeworkScale => {
  const list = Array.isArray(options) ? options : [];
  return {
    max: Math.max(0, ...list.map((option: any) => Number(option?.score) || 0)),
    labels: new Map(list.map((option: any) => [Number(option?.score) || 0, String(option?.label || '')])),
  };
};

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== '';

/**
 * Students who, in lessons they came to, had homework not done or done partly (half the homework
 * score or less: "Half", "Weak", "None" by default) or scored under 70% of the lesson's best
 * possible total, at least twice this month, per group. A lesson with both counts once; each keeps
 * its reasons, homework label and score for the details. An absent lesson (0 for attendance) is
 * the absence alerts' job and is not counted here.
 */
const findHomeworkWarnings = (rows: any[], scoringByCenter: Map<number, CenterScoring>) => {
  const byStudentClass = new Map<string, any>();
  rows.forEach((row) => {
    const attendance = hasValue(row.attendance_score) ? Number(row.attendance_score) : null;
    if (attendance === 0) return;
    if (!['attendance_score', 'homework_score', 'activity_score', 'points_score'].some((key) => hasValue(row[key]))) return;
    const scoring = scoringByCenter.get(Number(row.center_id));
    if (!scoring) return;
    const homework = hasValue(row.homework_score) ? Number(row.homework_score) : null;
    const weakHomework = homework !== null && scoring.homework.max > 0 && homework <= scoring.homework.max / 2;
    const percent = Math.round((combineLessonScore(row) / lessonMaxScore(row, scoring.settings)) * 100);
    const lowScore = percent < LOW_SCORE_PERCENT;
    if (!weakHomework && !lowScore) return;
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
      lessons: [] as any[],
    };
    entry.lessons.push({
      date: String(row.session_date).slice(0, 10),
      homework_score: homework,
      homework_label: homework === null ? null : scoring.homework.labels.get(homework) || null,
      score_percent: percent,
      reasons: [weakHomework && 'homework', lowScore && 'low_score'].filter(Boolean),
    });
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
  // Each center sets its own scales and labels in Settings.
  const centerIds = Array.from(new Set(rows.map((row: any) => Number(row.center_id)))) as number[];
  const scoringByCenter = new Map<number, CenterScoring>();
  await Promise.all(centerIds.map(async (id) => {
    const settings = (await settingsService.getLessonScoring(id)) || {};
    scoringByCenter.set(id, { homework: toScale(settings.homework), settings });
  }));
  return { month, students: findHomeworkWarnings(rows, scoringByCenter) };
};

module.exports = { listHomeworkWarnings, findHomeworkWarnings, WARNING_LESSONS, LOW_SCORE_PERCENT };
export {};
