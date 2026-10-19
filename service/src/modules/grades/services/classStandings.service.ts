const classStandingsRepository = require('../repositories/classStandings.repository');
const { combineLessonScore } = require('./lessonScore');

// A group's standings: each student's points over all their lessons in the group, their place,
// and whether their recent lessons are going better or worse than the ones before.

/**
 * Lessons compared on each side of the trend: the last TREND_LESSONS against the ones before. A
 * student with fewer lessons compares the halves they have (2 lessons: the last against the one
 * before), so the arrow shows from the second lesson on.
 */
const TREND_LESSONS = 4;
/** A change in the average smaller than this share of the earlier average reads as flat. */
const TREND_THRESHOLD = 0.05;

type Trend = { direction: 'up' | 'down' | 'flat'; recent_average: number; previous_average: number } | null;

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const round1 = (value: number) => Math.round(value * 10) / 10;

/** Scores are oldest first; needs at least two lessons. */
const lessonTrend = (scores: number[]): Trend => {
  const side = Math.min(TREND_LESSONS, Math.floor(scores.length / 2));
  if (side < 1) return null;
  const recent = average(scores.slice(-side));
  const previous = average(scores.slice(-side * 2, -side));
  const change = recent - previous;
  const flatBand = Math.abs(previous) * TREND_THRESHOLD;
  const direction = previous === 0
    ? (recent > 0 ? 'up' : 'flat')
    : change >= flatBand ? 'up' : change <= -flatBand ? 'down' : 'flat';
  return { direction, recent_average: round1(recent), previous_average: round1(previous) };
};

const classStandings = async (classId: number, centerId?: number, teacherId?: number) => {
  const rows = await classStandingsRepository.findClassLessonScores({ classId, centerId, teacherId });
  const byStudent = new Map<number, number[]>();
  rows.forEach((row: any) => {
    const studentId = Number(row.student_id);
    if (!byStudent.has(studentId)) byStudent.set(studentId, []);
    byStudent.get(studentId)!.push(Number(combineLessonScore(row)) || 0);
  });

  const standings = [...byStudent.entries()]
    .map(([studentId, scores]) => ({
      student_id: studentId,
      total_points: Math.round(scores.reduce((sum, score) => sum + score, 0)),
      lessons: scores.length,
      trend: lessonTrend(scores),
    }))
    .sort((a, b) => b.total_points - a.total_points || a.student_id - b.student_id);

  // Equal points share a place (1, 2, 2, 4).
  let place = 0;
  return standings.map((row, index) => {
    if (index === 0 || row.total_points !== standings[index - 1].total_points) place = index + 1;
    return { ...row, place };
  });
};

module.exports = { classStandings, lessonTrend, TREND_LESSONS, TREND_THRESHOLD };
export {};
