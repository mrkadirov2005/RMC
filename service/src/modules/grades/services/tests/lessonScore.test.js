const { combineLessonScore, lessonGrade, lessonMaxScore } = require('../lessonScore');
const { DEFAULT_LESSON_SCORING_SETTINGS } = require('../../../settings/lessonScoringDefaults');

describe('lesson score', () => {
  it('adds attendance, homework and activity up to 100', () => {
    expect(combineLessonScore({ attendance_score: 40, homework_score: 20, activity_score: 40 })).toBe(100);
    expect(combineLessonScore({ attendance_score: 30, homework_score: 10, activity_score: null })).toBe(40);
  });

  it('keeps the 100-point score exactly as typed: 80 stays 80, attendance is not added', () => {
    expect(combineLessonScore({ attendance_score: 40, points_score: 80 })).toBe(80);
    expect(combineLessonScore({ attendance_score: 40, points_score: 99 })).toBe(99);
    expect(combineLessonScore({ attendance_score: 40, points_score: 77 })).toBe(77);
    // It stands in for homework and activity.
    expect(combineLessonScore({ attendance_score: 40, homework_score: 20, activity_score: 40, points_score: 50 })).toBe(50);
  });

  it('grades a 100-point lesson out of 100, with or without attendance', () => {
    expect(lessonMaxScore({ points_score: 80 }, DEFAULT_LESSON_SCORING_SETTINGS)).toBe(100);
    expect(lessonMaxScore({ attendance_score: 40, points_score: 80 }, DEFAULT_LESSON_SCORING_SETTINGS)).toBe(100);
  });

  it('counts points in full when there is no attendance', () => {
    expect(combineLessonScore({ points_score: 80 })).toBe(80);
  });

  it('gives 5 from 90, 4 from 70, 3 from 50, else 2', () => {
    expect([100, 90, 89, 70, 69, 50, 49, 0].map(lessonGrade)).toEqual(['5', '5', '4', '4', '3', '3', '2', '2']);
  });

  describe('lessonMaxScore', () => {
    const settings = DEFAULT_LESSON_SCORING_SETTINGS;

    it('grades a lesson only against the categories that were recorded', () => {
      expect(lessonMaxScore({ attendance_score: 40 }, settings)).toBe(40);
      expect(lessonMaxScore({ attendance_score: 0, homework_score: 20 }, settings)).toBe(60);
      expect(lessonMaxScore({ attendance_score: 40, homework_score: 20, activity_score: 40 }, settings)).toBe(100);
    });

    it('matches the points rule: attendance + 60, or 100 for points alone', () => {
      expect(lessonMaxScore({ attendance_score: 30, points_score: 80 }, settings)).toBe(100);
      expect(lessonMaxScore({ points_score: 80 }, settings)).toBe(100);
    });

    it('falls back to 100 when nothing was recorded', () => {
      expect(lessonMaxScore({}, settings)).toBe(100);
    });
  });
});
