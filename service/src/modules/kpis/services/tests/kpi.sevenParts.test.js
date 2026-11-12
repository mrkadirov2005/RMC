jest.mock('../../repositories/kpi.repository', () => ({}));
jest.mock('../../../teachers/services/teacher.service', () => ({}));
jest.mock('../../../owners/services/owner.service', () => ({}));
jest.mock('../../../superusers/services/superuser.service', () => ({}));

const { computeFinalScore, computeGradingScore, rankBy } = require('../kpi.service');

describe('teacher KPI in seven parts', () => {
  test('the total is the average of the six 100-point parts plus 1 point per student who came asking for the teacher', () => {
    expect(computeFinalScore({
      retentionScore: 90, studentScore: 80, contributionScore: 70, examScore: 85, teachingQualityScore: 95, gradingScore: 100, referralCount: 0,
    })).toBe(86.67);
    expect(computeFinalScore({
      retentionScore: 90, studentScore: 80, contributionScore: 70, examScore: 85, teachingQualityScore: 95, gradingScore: 100, referralCount: 3,
    })).toBe(89.67);
  });

  test('on-time scoring takes lesson control\'s minus from 100, never below 0 or above 100', () => {
    expect(computeGradingScore(-15)).toBe(85);
    expect(computeGradingScore(-160)).toBe(0);
    expect(computeGradingScore(10)).toBe(100);
  });

  test('ranks highest first; equal scores share a place; teachers without a score get none', () => {
    const rows = [{ id: 'a', score: 80 }, { id: 'b', score: 92 }, { id: 'c', score: 80 }, { id: 'd', score: null }];
    const places = rankBy(rows, (row) => row.score);
    expect(rows.map((row) => places.get(row) ?? null)).toEqual([2, 1, 2, null]);
  });
});
