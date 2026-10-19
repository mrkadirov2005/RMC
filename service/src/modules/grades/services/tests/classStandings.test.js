jest.mock('../../repositories/classStandings.repository', () => ({ findClassLessonScores: jest.fn() }));
const repository = require('../../repositories/classStandings.repository');
const { classStandings, lessonTrend } = require('../classStandings.service');

const lesson = (studentId, total) => ({ student_id: studentId, attendance_score: total, homework_score: null, activity_score: null, points_score: null });

describe('group standings', () => {
  test('ranks by points over all lessons; equal points share a place', async () => {
    repository.findClassLessonScores.mockResolvedValue([
      lesson(1, 40), lesson(2, 90), lesson(3, 90), lesson(1, 30), lesson(4, 10),
      { student_id: 4, attendance_score: 40, points_score: 50 }, // 40 + 60% of 50
    ]);
    const result = await classStandings(7, 2, 9);
    expect(repository.findClassLessonScores).toHaveBeenCalledWith({ classId: 7, centerId: 2, teacherId: 9 });
    expect(result.map((row) => [row.student_id, row.total_points, row.lessons, row.place])).toEqual([
      [2, 90, 1, 1],
      [3, 90, 1, 1],
      [4, 80, 2, 3],
      [1, 70, 2, 4],
    ]);
  });

  test('a group with no scored lessons has no standings', async () => {
    repository.findClassLessonScores.mockResolvedValue([]);
    expect(await classStandings(7)).toEqual([]);
  });
});

describe('lesson trend', () => {
  test('needs two lessons; with fewer than eight it compares the halves', () => {
    expect(lessonTrend([])).toBeNull();
    expect(lessonTrend([70])).toBeNull();
    expect(lessonTrend([70, 50])).toEqual({ direction: 'down', recent_average: 50, previous_average: 70 });
    // Five lessons: the last two against the two before; the first is left out.
    expect(lessonTrend([0, 40, 40, 60, 60])).toEqual({ direction: 'up', recent_average: 60, previous_average: 40 });
  });

  test('the last four lessons against the four before', () => {
    expect(lessonTrend([0, 0, 50, 50, 50, 50, 60, 60, 60, 60])).toEqual({ direction: 'up', recent_average: 60, previous_average: 50 });
    expect(lessonTrend([80, 80, 80, 80, 60, 60, 60, 60])).toEqual({ direction: 'down', recent_average: 60, previous_average: 80 });
  });

  test('a change under 5% of the earlier average is flat; exactly 5% is not', () => {
    expect(lessonTrend([80, 80, 80, 80, 83, 83, 83, 83]).direction).toBe('flat');
    expect(lessonTrend([80, 80, 80, 80, 84, 84, 84, 84]).direction).toBe('up');
    expect(lessonTrend([80, 80, 80, 80, 76, 76, 76, 76]).direction).toBe('down');
  });

  test('all zeros is flat; up from zero is up', () => {
    expect(lessonTrend([0, 0, 0, 0, 0, 0, 0, 0]).direction).toBe('flat');
    expect(lessonTrend([0, 0, 0, 0, 10, 0, 0, 0]).direction).toBe('up');
  });
});
