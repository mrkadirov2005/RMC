const { combineLessonScore, lessonGrade } = require('../lessonScore');

describe('lesson score', () => {
  it('adds attendance, homework and activity up to 100', () => {
    expect(combineLessonScore({ attendance_score: 40, homework_score: 20, activity_score: 40 })).toBe(100);
    expect(combineLessonScore({ attendance_score: 30, homework_score: 10, activity_score: null })).toBe(40);
  });

  it('counts the 100-point score as 60 next to attendance, so it never reaches 150', () => {
    expect(combineLessonScore({ attendance_score: 40, points_score: 100 })).toBe(100);
    expect(combineLessonScore({ attendance_score: 40, points_score: 75 })).toBe(85);
    // It stands in for homework and activity.
    expect(combineLessonScore({ attendance_score: 40, homework_score: 20, activity_score: 40, points_score: 50 })).toBe(70);
  });

  it('counts points in full when there is no attendance', () => {
    expect(combineLessonScore({ points_score: 80 })).toBe(80);
  });

  it('gives 5 from 90, 4 from 70, 3 from 50, else 2', () => {
    expect([100, 90, 89, 70, 69, 50, 49, 0].map(lessonGrade)).toEqual(['5', '5', '4', '4', '3', '3', '2', '2']);
  });
});
