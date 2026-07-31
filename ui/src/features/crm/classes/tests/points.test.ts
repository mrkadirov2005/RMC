import { describe, expect, it } from 'vitest';
import { getCombinedLessonPoints } from '../utils/points';

describe('getCombinedLessonPoints', () => {
  it('adds attendance, homework, activity, and manual points', () => {
    expect(getCombinedLessonPoints({
      attendance_score: 50,
      homework_score: 20,
      activity_score: 30,
      points_score: 5,
    })).toBe(105);
  });

  it('treats omitted score categories as zero', () => {
    expect(getCombinedLessonPoints({ attendance_score: 50, points_score: null })).toBe(50);
  });

  it('returns missing only when no score category was recorded', () => {
    expect(getCombinedLessonPoints({})).toBeNull();
    expect(getCombinedLessonPoints(null)).toBeNull();
    expect(getCombinedLessonPoints({ points_score: 0 })).toBe(0);
  });
});
