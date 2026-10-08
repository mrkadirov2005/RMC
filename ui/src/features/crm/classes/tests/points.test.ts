import { describe, expect, it } from 'vitest';
import { getCombinedLessonPoints, getLessonGrade, getPointTone } from '../utils/points';

describe('getCombinedLessonPoints', () => {
  it('adds attendance, homework and activity up to 100', () => {
    expect(getCombinedLessonPoints({ attendance_score: 40, homework_score: 20, activity_score: 40 })).toBe(100);
  });

  it('counts the 100-point score as 60 next to attendance, in place of homework and activity', () => {
    expect(getCombinedLessonPoints({ attendance_score: 40, homework_score: 20, activity_score: 30, points_score: 100 })).toBe(100);
    expect(getCombinedLessonPoints({ attendance_score: 40, points_score: 50 })).toBe(70);
    expect(getCombinedLessonPoints({ points_score: 80 })).toBe(80);
  });

  it('treats omitted score categories as zero', () => {
    expect(getCombinedLessonPoints({ attendance_score: 40, points_score: null })).toBe(40);
  });

  it('turns a lesson total into a 2-5 grade', () => {
    expect([100, 90, 85, 70, 65, 50, 30].map(getLessonGrade)).toEqual([5, 5, 4, 4, 3, 3, 2]);
  });

  it('returns missing only when no score category was recorded', () => {
    expect(getCombinedLessonPoints({})).toBeNull();
    expect(getCombinedLessonPoints(null)).toBeNull();
    expect(getCombinedLessonPoints({ points_score: 0 })).toBe(0);
  });
});

describe('getPointTone', () => {
  it('provides dark-mode contrast for missing and recorded scores', () => {
    expect(getPointTone(null).className).toContain('dark:text-rose-300');
    expect(getPointTone(100).className).toContain('dark:text-emerald-300');
  });
});
