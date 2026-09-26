import { describe, expect, it } from 'vitest';
import { buildStudentTimelinePoints, getStudentTimelineBounds } from '../studentTimelineModel';

describe('student timeline model', () => {
  const students = [
    { created_at: '2024-01-03T09:00:00.000Z' },
    { created_at: '2024-01-08T12:00:00.000Z' },
    { createdAt: '2024-02-10T00:00:00.000Z' },
    { created_at: 'invalid' },
    {},
  ];

  it('finds the actual registration-date range and ignores invalid dates', () => {
    expect(getStudentTimelineBounds(students)).toEqual({ min: '2024-01-03', max: '2024-02-10' });
  });

  it('builds daily cumulative counts and includes students registered before the selected range', () => {
    expect(buildStudentTimelinePoints(students, '2024-01-05', '2024-01-08', 'daily')).toEqual([
      { label: '2024-01-05', value: 1 },
      { label: '2024-01-06', value: 1 },
      { label: '2024-01-07', value: 1 },
      { label: '2024-01-08', value: 2 },
    ]);
  });

  it('groups weekly and monthly counts while ending at the selected date', () => {
    expect(buildStudentTimelinePoints(students, '2024-01-03', '2024-01-14', 'weekly')).toEqual([
      { label: '2024-01-07', value: 1 },
      { label: '2024-01-14', value: 2 },
    ]);
    expect(buildStudentTimelinePoints(students, '2024-01-15', '2024-02-10', 'monthly')).toEqual([
      { label: '2024-01-31', value: 2 },
      { label: '2024-02-10', value: 3 },
    ]);
  });

  it('returns no points for an invalid range', () => {
    expect(buildStudentTimelinePoints(students, '2024-02-01', '2024-01-01', 'daily')).toEqual([]);
  });
});
