import { describe, expect, it } from 'vitest';
import { defaultLessonScoringSettings } from '../lessonScoringSettings';
import {
  buildSessionWorkflowRecords,
  clampWorkflowPoints,
  getWorkflowCounts,
  getWorkflowTotalScore,
} from '../sessionWorkflowModel';

describe('session workflow model', () => {
  it('clamps and normalizes manual points', () => {
    expect(clampWorkflowPoints('101')).toBe('100');
    expect(clampWorkflowPoints('-5')).toBe('0');
    expect(clampWorkflowPoints('49.6')).toBe('50');
    expect(clampWorkflowPoints('')).toBe('');
  });

  it('counts completed values independently', () => {
    const counts = getWorkflowCounts(
      2,
      new Map([[1, 'On time'], [2, 'Absent']]),
      new Map([[1, 'Good'], [2, '']]),
      new Map([[1, 'Average'], [2, 'Weak']]),
      new Map([[1, '0'], [2, '50']]),
    );
    expect(counts.allAttendanceMarked).toBe(true);
    expect(counts.allHomeworkMarked).toBe(false);
    expect(counts.allPointsMarked).toBe(true);
  });

  it('calculates combined scores only from selected actions', () => {
    expect(getWorkflowTotalScore({
      studentId: 1,
      selectedActions: ['attendance', 'homework', 'points'],
      attendance: new Map([[1, 'On time']]),
      homework: new Map([[1, 'Good']]),
      activity: new Map([[1, 'Very active']]),
      points: new Map([[1, '5']]),
      settings: defaultLessonScoringSettings,
    })).toBe(70);
  });

  it('builds the API record and awards the stellar bonus once', () => {
    const records = buildSessionWorkflowRecords({
      students: [{ student_id: 7 }, { student_id: 8 }],
      selectedActions: ['attendance', 'homework', 'activity', 'coins'],
      attendance: new Map([[7, 'On time'], [8, 'Absent']]),
      homework: new Map([[7, 'Excellent'], [8, 'None']]),
      activity: new Map([[7, 'Very active'], [8, 'No activity']]),
      points: new Map(),
      stellarStudentId: 7,
      settings: defaultLessonScoringSettings,
    });
    expect(records[0]).toMatchObject({ student_id: 7, attendance_status: 'Present', homework_score: 20, activity_score: 30, stellar_bonus_coins: 30 });
    expect(records[1].stellar_bonus_coins).toBe(0);
  });
});
