import { getCombinedLessonPoints } from './points';

// Monthly score ranking for a group: places 1-5 for the highest totals (shown green) and a red
// list for the lowest five. Only students with at least one scored lesson that month take part.

export const RANKING_SIZE = 5;

export type MonthlyRank = { tone: 'top'; place: number } | { tone: 'bottom' };

/** Each student's points total and how many lessons were scored, from the month's lesson sessions. */
export const getMonthlyTotals = (
  studentIds: number[],
  sessionIds: number[],
  pointsBySessionStudent: Map<string, unknown>
) => {
  const totals = new Map<number, { total: number; scored: number }>();
  studentIds.forEach((studentId) => {
    let total = 0;
    let scored = 0;
    sessionIds.forEach((sessionId) => {
      if (!sessionId) return;
      const points = getCombinedLessonPoints(pointsBySessionStudent.get(`${sessionId}:${studentId}`) as Parameters<typeof getCombinedLessonPoints>[0]);
      if (points === null || points === undefined) return;
      total += Number(points) || 0;
      scored += 1;
    });
    totals.set(studentId, { total, scored });
  });
  return totals;
};

/**
 * Top five (places 1-5) and bottom five by monthly total. In a small group the bottom list never
 * repeats a top student, so with five or fewer scored students there is no red list.
 */
export const rankMonthlyTotals = (totals: Map<number, { total: number; scored: number }>, size = RANKING_SIZE) => {
  const ranked = Array.from(totals.entries())
    .filter(([, value]) => value.scored > 0)
    .sort((a, b) => b[1].total - a[1].total);
  const ranks = new Map<number, MonthlyRank>();
  ranked.slice(0, size).forEach(([studentId], index) => ranks.set(studentId, { tone: 'top', place: index + 1 }));
  ranked.slice(Math.max(size, ranked.length - size)).forEach(([studentId]) => ranks.set(studentId, { tone: 'bottom' }));
  return ranks;
};

/** Row tint for a ranked student: green for the top five, red for the red list. */
export const rankRowClassName = (rank?: MonthlyRank) =>
  !rank ? '' : rank.tone === 'top'
    ? 'bg-emerald-50/80 dark:bg-emerald-950/30'
    : 'bg-rose-50/80 dark:bg-rose-950/30';
