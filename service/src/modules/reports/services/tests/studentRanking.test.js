jest.mock('../../repositories/studentRanking.repository', () => ({ findMonthLessonScores: jest.fn() }));

const repository = require('../../repositories/studentRanking.repository');
const { studentRankings, monthBounds } = require('../studentRanking.service');

const lesson = (studentId, classId, scores, extra = {}) => ({
  student_id: studentId, first_name: `S${studentId}`, last_name: null, center_id: 4, class_id: classId, class_name: `G${classId}`, level: 2, ...scores, ...extra,
});

describe('student rankings', () => {
  it('works out the month range, across a year end', () => {
    expect(monthBounds('2026-10')).toEqual({ monthStart: '2026-10-01', monthEnd: '2026-11-01' });
    expect(monthBounds('2026-12')).toEqual({ monthStart: '2026-12-01', monthEnd: '2027-01-01' });
  });

  it('sums each child per group with the lesson score rules and counts their lessons', async () => {
    repository.findMonthLessonScores.mockResolvedValue([
      lesson(1, 10, { attendance_score: 40, homework_score: 20, activity_score: 40 }),
      lesson(1, 10, { attendance_score: 30, points_score: 50 }),
      lesson(1, 11, { attendance_score: 40 }),
      lesson(2, 10, { attendance_score: 0, homework_score: null, activity_score: null }, { level: null }),
    ]);
    const result = await studentRankings({ month: '2026-10' }, 4);
    expect(repository.findMonthLessonScores).toHaveBeenCalledWith({ centerId: 4, monthStart: '2026-10-01', monthEnd: '2026-11-01' });
    expect(result.month).toBe('2026-10');
    expect(result.rows).toEqual([
      { student_id: 1, name: 'S1', center_id: 4, class_id: 10, class_name: 'G10', level: 2, lessons: 2, score: 160 },
      { student_id: 1, name: 'S1', center_id: 4, class_id: 11, class_name: 'G11', level: 2, lessons: 1, score: 40 },
      { student_id: 2, name: 'S2', center_id: 4, class_id: 10, class_name: 'G10', level: null, lessons: 1, score: 0 },
    ]);
  });

  it('defaults a missing or bad month to the current month in Tashkent', async () => {
    repository.findMonthLessonScores.mockResolvedValue([]);
    const result = await studentRankings({ month: '2026-13' }, undefined, new Date('2026-10-31T20:00:00Z'));
    expect(result.month).toBe('2026-11');
    expect(repository.findMonthLessonScores).toHaveBeenLastCalledWith({ centerId: undefined, monthStart: '2026-11-01', monthEnd: '2026-12-01' });
  });
});
