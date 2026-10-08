import { describe, expect, it } from 'vitest';
import { defaultLessonScoringSettings } from '../lessonScoringSettings';
import {
  buildLessonSummary,
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
      points: new Map([[1, '50']]),
      settings: defaultLessonScoringSettings,
    // On time 40 + 60% of 50 points; homework does not add on top of points.
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

  it('saves a written absence reason as the attendance remarks', () => {
    const records = buildSessionWorkflowRecords({
      students: [{ student_id: 7 }, { student_id: 8 }],
      selectedActions: ['attendance'],
      attendance: new Map([[7, 'Absent'], [8, 'On time']]),
      homework: new Map(),
      activity: new Map(),
      points: new Map(),
      stellarStudentId: null,
      settings: defaultLessonScoringSettings,
      attendanceReasons: new Map([[7, ' Kasal, ota-onasi bilan gaplashildi ']]),
    });
    expect(records[0].attendance_remarks).toBe('Kasal, ota-onasi bilan gaplashildi');
    expect(records[1].attendance_remarks).toBe('Daily Session Grading');
  });
});

describe('lesson summary', () => {
  const students = [
    { student_id: 1, first_name: 'Ali', last_name: 'Valiyev' },
    { student_id: 2, first_name: 'Bobur' },
    { student_id: 3, first_name: 'Dilnoza' },
    { student_id: 4, first_name: 'Moved' },
  ];
  const attendance = new Map([[1, 'On time'], [2, 'Late'], [3, 'Absent'], [4, 'On time']]);
  const homework = new Map([[1, 'Excellent'], [2, 'Half'], [3, ''], [4, 'Good']]);

  const summary = buildLessonSummary({
    students,
    selectedActions: ['attendance', 'homework', 'coins'],
    attendance,
    homework,
    activity: new Map(),
    points: new Map(),
    stellarStudentId: 1,
    settings: defaultLessonScoringSettings,
    saveResult: {
      coins: [{ transaction: { student_id: 1, delta: 50 } }, { transaction: { student_id: 2, delta: -5 } }, { transaction: { student_id: 3, delta: -20 } }],
      skipped_student_ids: [4],
    },
  });

  it('leaves out students the server skipped', () => {
    expect(summary.total).toBe(3);
    expect(summary.skipped).toBe(1);
  });

  it('counts late students as present and lists who missed the lesson', () => {
    expect(summary.attendance).toMatchObject({ present: 2, rate: 67 });
    expect(summary.attendance?.breakdown.map((item) => [item.label, item.count])).toEqual([
      ['On time', 1], ['Late', 1], ['Excused', 0], ['Absent', 1],
    ]);
    expect(summary.missedStudents).toEqual([{ id: 3, name: 'Dilnoza', status: 'Absent' }]);
  });

  it('scores the lesson against the best possible total for the chosen actions', () => {
    // max = 40 attendance + 20 homework; scores 60 (on time + excellent), 40 (late + half), 0
    // → average 33.3 → 56%
    expect(summary.maxScore).toBe(60);
    expect(summary.averageScore).toBe(33.3);
    expect(summary.averagePercent).toBe(56);
    expect(summary.status).toBe('fair');
    expect(summary.activity).toBeNull();
    expect(summary.pointsAverage).toBeNull();
  });

  it('ranks top students and reports the saved coins', () => {
    expect(summary.topStudents.map((item) => item.name)).toEqual(['Ali Valiyev', 'Bobur']);
    expect(summary.coins).toEqual({ total: 25, students: 3 });
    expect(summary.stellarStudentName).toBe('Ali Valiyev');
  });
});
