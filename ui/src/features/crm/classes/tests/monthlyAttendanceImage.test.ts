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
      { id: 2, name: 'Isomova Ziyoda', marks: ['absent', 'excused'], attended: 0, recorded: 2 },
      { id: 1, name: 'Valiyev Ali', marks: ['late', 'present'], attended: 2, recorded: 2 },
    ]);
  });
});
