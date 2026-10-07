import { describe, expect, it } from 'vitest';
import { getMonthlyTotals, rankMonthlyTotals } from '../utils/monthlyRanking';

const totalsOf = (entries: Array<[number, number, number?]>) =>
  new Map(entries.map(([id, total, scored = 1]) => [id, { total, scored }]));

describe('monthly ranking', () => {
  it('sums each student’s scored lessons and skips unscored ones', () => {
    const points = new Map<string, unknown>([
      ['10:1', { attendance_score: 50, homework_score: 20 }],
      ['11:1', { attendance_score: 40 }],
      ['10:2', null],
    ]);
    const totals = getMonthlyTotals([1, 2], [10, 11], points);
    expect(totals.get(1)).toEqual({ total: 110, scored: 2 });
    expect(totals.get(2)).toEqual({ total: 0, scored: 0 });
  });

  it('places the top five and red-lists the lowest five', () => {
    const totals = totalsOf(Array.from({ length: 12 }, (_, i) => [i + 1, (i + 1) * 10] as [number, number]));
    const ranks = rankMonthlyTotals(totals);
    expect([12, 11, 10, 9, 8].map((id) => ranks.get(id))).toEqual([1, 2, 3, 4, 5].map((place) => ({ tone: 'top', place })));
    expect([1, 2, 3, 4, 5].every((id) => ranks.get(id)?.tone === 'bottom')).toBe(true);
    expect(ranks.has(6)).toBe(false);
  });

  it('never red-lists a top student in a small group, and skips students with no scores', () => {
    const ranks = rankMonthlyTotals(totalsOf([[1, 90], [2, 80], [3, 70], [4, 60], [5, 50], [6, 40], [7, 30], [8, 0, 0]]));
    expect(ranks.get(5)).toEqual({ tone: 'top', place: 5 });
    expect(ranks.get(6)).toEqual({ tone: 'bottom' });
    expect(ranks.get(7)).toEqual({ tone: 'bottom' });
    expect(ranks.has(8)).toBe(false);
    expect(Array.from(rankMonthlyTotals(totalsOf([[1, 90], [2, 80]])).values()).every((rank) => rank.tone === 'top')).toBe(true);
  });
});
