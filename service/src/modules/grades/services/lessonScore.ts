// How a lesson's scores add up to its 100-point total, and the 2-5 grade it gives.
//
// Attendance (max 40) + homework (max 20) + activity (max 40) = 100. When the teacher instead
// gives the 100-point score, it stands in for homework and activity and counts for 60, so
// attendance + points is still at most 100 (it used to reach 150). Points given without
// attendance count in full.

const POINTS_WEIGHT_WITH_ATTENDANCE = 0.6;

const toNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const combineLessonScore = (scores: { attendance_score?: unknown; homework_score?: unknown; activity_score?: unknown; points_score?: unknown }) => {
  const attendance = toNumber(scores.attendance_score);
  const points = toNumber(scores.points_score);
  if (points !== null) {
    return attendance !== null ? attendance + Math.round(points * POINTS_WEIGHT_WITH_ATTENDANCE) : points;
  }
  return (attendance || 0) + (toNumber(scores.homework_score) || 0) + (toNumber(scores.activity_score) || 0);
};

const maxOptionScore = (options: unknown) =>
  Math.max(0, ...(Array.isArray(options) ? options : []).map((option: any) => Number(option?.score) || 0));

/**
 * The most a lesson can score given which categories were actually recorded, so a lesson that
 * only took attendance is graded out of 40, not 100. Mirrors combineLessonScore.
 */
const lessonMaxScore = (
  scores: { attendance_score?: unknown; homework_score?: unknown; activity_score?: unknown; points_score?: unknown },
  settings: { attendance?: unknown; homework?: unknown; activity?: unknown },
) => {
  const has = (value: unknown) => toNumber(value) !== null;
  const attendanceMax = has(scores.attendance_score) ? maxOptionScore(settings.attendance) : 0;
  if (has(scores.points_score)) return attendanceMax > 0 ? attendanceMax + Math.round(100 * POINTS_WEIGHT_WITH_ATTENDANCE) : 100;
  const total = attendanceMax
    + (has(scores.homework_score) ? maxOptionScore(settings.homework) : 0)
    + (has(scores.activity_score) ? maxOptionScore(settings.activity) : 0);
  return total > 0 ? total : 100;
};

/** 90+ is a 5, 70-89 a 4, 50-69 a 3, below 50 a 2 (out of 100). */
const lessonGrade = (scoreOutOf100: number) => (scoreOutOf100 >= 90 ? '5' : scoreOutOf100 >= 70 ? '4' : scoreOutOf100 >= 50 ? '3' : '2');

module.exports = { combineLessonScore, lessonMaxScore, lessonGrade, POINTS_WEIGHT_WITH_ATTENDANCE };

export {};
