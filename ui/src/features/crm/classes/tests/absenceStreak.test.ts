import { describe, expect, it } from 'vitest';
import { findAbsenceStreakStudents, getMissingAbsenceReasons, toAbsenceReason } from '../absenceStreak';

const records = [
  // Three earlier lessons: 09-28, 10-01, 10-03.
  { student_id: 1, attendance_date: '2026-09-28', status: 'Present' },
  { student_id: 1, attendance_date: '2026-10-01', status: 'Absent' },
  { student_id: 1, attendance_date: '2026-10-03', status: 'Absent' },
  { student_id: 2, attendance_date: '2026-10-01', status: 'Absent R' },
  { student_id: 2, attendance_date: '2026-10-03', status: 'Absent' },
  { student_id: 3, attendance_date: '2026-10-01', status: 'Absent' },
  { student_id: 3, attendance_date: '2026-10-03', status: 'Late' },
  { student_id: 4, attendance_date: '2026-10-03', status: 'Absent' },
  // Today's lesson is not "previous".
  { student_id: 5, attendance_date: '2026-10-01', status: 'Absent' },
  { student_id: 5, attendance_date: '2026-10-06', status: 'Absent' },
];

describe('absence streak', () => {
  it('flags only students absent (unexcused) from both previous lessons', () => {
    expect(Array.from(findAbsenceStreakStudents({ records, lessonDate: '2026-10-06' }))).toEqual([1]);
  });

  it('flags nobody before the class has had two lessons', () => {
    expect(findAbsenceStreakStudents({ records: records.slice(0, 1), lessonDate: '2026-10-06' }).size).toBe(0);
  });

  it('looks at the lessons before the one being edited', () => {
    // Editing the 10-03 lesson: the previous two are 09-28 and 10-01.
    expect(findAbsenceStreakStudents({ records, lessonDate: '2026-10-03' }).size).toBe(0);
  });

  it('reads back a saved reason and lists the missing ones', () => {
    expect(toAbsenceReason('Daily Session Grading')).toBe('');
    expect(toAbsenceReason(' Kasal ')).toBe('Kasal');
    expect(getMissingAbsenceReasons(new Set([1, 2]), new Map([[1, 'Kasal'], [2, '  ']]), [1, 2, 3])).toEqual([2]);
  });
});
