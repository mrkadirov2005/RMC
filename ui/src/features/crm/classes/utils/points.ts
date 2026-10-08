export const getPointTone = (points: number | null) => {
  if (points === null) return { label: 'Missing', className: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700', icon: '!' };
  if (points === 0) return { label: 'Zero', className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600', icon: '0' };
  if (points < 50) return { label: 'Low', className: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700', icon: '-' };
  if (points < 80) return { label: 'Good', className: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700', icon: '+' };
  return { label: 'Strong', className: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700', icon: '✓' };
};

export type LessonPointRecord = {
  attendance_score?: number | string | null;
  homework_score?: number | string | null;
  activity_score?: number | string | null;
  points_score?: number | string | null;
};

/** Weight of the 100-point score next to attendance, so the lesson total stays at most 100. */
export const POINTS_WEIGHT_WITH_ATTENDANCE = 0.6;

const toScore = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * A lesson's total out of 100, the same rule the server uses (grades/services/lessonScore.ts):
 * attendance + homework + activity, or, when the 100-point score was given, attendance + 60% of
 * it (it stands in for homework and activity). Points without attendance count in full.
 */
export const combineLessonScore = (scores: LessonPointRecord) => {
  const attendance = toScore(scores.attendance_score);
  const points = toScore(scores.points_score);
  if (points !== null) return attendance !== null ? attendance + Math.round(points * POINTS_WEIGHT_WITH_ATTENDANCE) : points;
  return (attendance || 0) + (toScore(scores.homework_score) || 0) + (toScore(scores.activity_score) || 0);
};

/** 90+ is a 5, 70-89 a 4, 50-69 a 3, below 50 a 2 (out of 100). */
export const getLessonGrade = (scoreOutOf100: number) =>
  scoreOutOf100 >= 90 ? 5 : scoreOutOf100 >= 70 ? 4 : scoreOutOf100 >= 50 ? 3 : 2;

export const getCombinedLessonPoints = (grade?: LessonPointRecord | null): number | null => {
  if (!grade) return null;
  const values = [grade.attendance_score, grade.homework_score, grade.activity_score, grade.points_score];
  if (values.every((value) => value === null || value === undefined || value === '')) return null;
  return combineLessonScore(grade);
};
