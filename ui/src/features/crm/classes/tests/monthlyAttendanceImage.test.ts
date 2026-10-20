import { describe, expect, it } from 'vitest';
import { buildMonthlyAttendanceGrid, formatAttendanceMonth, toAttendanceMark } from '../monthlyAttendanceImage';

describe('monthly attendance image', () => {
  it('reads the stored attendance statuses', () => {
    expect(toAttendanceMark('Present')).toBe('present');
    expect(toAttendanceMark('Late')).toBe('late');
    expect(toAttendanceMark('Absent R')).toBe('excused');
    expect(toAttendanceMark('Absent')).toBe('absent');
    expect(toAttendanceMark('on_time')).toBe('present');
    expect(toAttendanceMark('')).toBeNull();
    expect(formatAttendanceMonth('2026-10')).toBe('Oktyabr 2026');
  });

  it('builds one row per student and one column per lesson date in the month', () => {
    const grid = buildMonthlyAttendanceGrid({
      monthKey: '2026-10',
      students: [
        { student_id: 2, first_name: 'Ziyoda', last_name: 'Isomova' },
        { student_id: 1, first_name: 'Ali', last_name: 'Valiyev' },
        { student_id: 3, first_name: 'Gone', last_name: 'Student', deleted_at: '2026-10-01' },
      ],
      records: [
        { student_id: 1, attendance_date: '2026-10-06', status: 'Present' },
        { student_id: 1, attendance_date: '2026-10-02', status: 'Late' },
        { student_id: 2, attendance_date: '2026-10-02', status: 'Absent' },
        { student_id: 2, attendance_date: '2026-10-06', status: 'Absent R' },
        // Another month is left out.
        { student_id: 1, attendance_date: '2026-09-30', status: 'Present' },
      ],
    });

    expect(grid.dates).toEqual(['2026-10-02', '2026-10-06']);
    expect(grid.rows).toEqual([
      { id: 2, name: 'Isomova Ziyoda', marks: ['absent', 'excused'], scores: [null, null], attended: 0, recorded: 2, lessons: 0, total: 0 },
      { id: 1, name: 'Valiyev Ali', marks: ['late', 'present'], scores: [null, null], attended: 2, recorded: 2, lessons: 0, total: 0 },
    ]);
  });

  it('puts each lesson score in its cell and totals the month', () => {
    const grid = buildMonthlyAttendanceGrid({
      monthKey: '2026-10',
      students: [{ student_id: 1, first_name: 'Ali', last_name: 'Valiyev' }],
      records: [{ student_id: 1, attendance_date: '2026-10-02', status: 'Present' }],
      scores: [
        { student_id: 1, session_date: '2026-10-02', attendance_score: 40, homework_score: 20, activity_score: 30 },
        // Scored without attendance taken: the date still gets a column.
        { student_id: 1, session_date: '2026-10-09T00:00:00.000Z', attendance_score: 30, points_score: 50 },
        // Nothing recorded and another month are left out.
        { student_id: 1, session_date: '2026-10-16', attendance_score: null, homework_score: null },
        { student_id: 1, session_date: '2026-09-25', attendance_score: 40 },
      ],
    });

    expect(grid.dates).toEqual(['2026-10-02', '2026-10-09']);
    expect(grid.rows[0]).toMatchObject({ marks: ['present', null], scores: [90, 60], lessons: 2, total: 150 });
  });

  it('with standings, rows go by place over all lessons (no lessons last) and carry the place and trend', () => {
    const students = [
      { student_id: 1, first_name: 'Ali', last_name: 'Valiyev' },
      { student_id: 2, first_name: 'Ziyoda', last_name: 'Isomova' },
      { student_id: 3, first_name: 'Bek', last_name: 'Aliyev' },
    ];
    const standings = new Map([
      [2, { place: 1, total_points: 310, lessons: 4, trend: { direction: 'up' as const } }],
      [1, { place: 2, total_points: 280, lessons: 4, trend: null }],
    ]);
    const grid = buildMonthlyAttendanceGrid({ monthKey: '2026-10', students, records: [], standings });
    expect(grid.ranked).toBe(true);
    expect(grid.rows.map((row) => row.id)).toEqual([2, 1, 3]);
    expect(grid.rows[0].standing).toMatchObject({ place: 1, total_points: 310, trend: { direction: 'up' } });
    expect(grid.rows[2].standing).toBeUndefined();
  });

  it('without standings, rows stay A–Z as before', () => {
    const grid = buildMonthlyAttendanceGrid({
      monthKey: '2026-10',
      students: [{ student_id: 1, first_name: 'Ali', last_name: 'Valiyev' }, { student_id: 3, first_name: 'Bek', last_name: 'Aliyev' }],
      records: [],
    });
    expect(grid.ranked).toBe(false);
    expect(grid.rows.map((row) => row.id)).toEqual([3, 1]);
  });
});
