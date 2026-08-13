import { describe, expect, it } from 'vitest';
import {
  deriveAvailability,
  deriveUtilization,
  enrichSchedule,
  filterSchedule,
  overlaps,
  weekdayForDate,
} from '../workspaceModel';
import type { RoomAssignment } from '../roomModel';

const assignments: RoomAssignment[] = [
  {
    room_id: 1,
    room_number: 'Room 101',
    class_id: 11,
    class_name: 'A1 Morning',
    day: 'Monday',
    time: '09:00',
    end_time: '10:00',
  },
  {
    room_id: 2,
    room_number: 'Room 102',
    class_id: null,
  },
];

describe('rooms workspace model', () => {
  it('treats touching intervals as available and intersecting intervals as conflicts', () => {
    expect(overlaps('08:00', '09:00', '09:00', '10:00')).toBe(false);
    expect(overlaps('10:00', '11:00', '09:00', '10:00')).toBe(false);
    expect(overlaps('09:30', '10:30', '09:00', '10:00')).toBe(true);
    expect(overlaps('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });

  it('derives weekdays without depending on the browser timezone', () => {
    expect(weekdayForDate('2026-08-10')).toBe('Monday');
  });

  it('enriches assignments with their teacher, subject, and student count', () => {
    const [row] = enrichSchedule(
      assignments,
      [{ class_id: 11, teacher_id: 7, subject_name: 'English', student_count: 14 }],
      [{ teacher_id: 7, first_name: 'Ada', last_name: 'Lovelace' }],
    );

    expect(row).toMatchObject({
      room_number: 'Room 101',
      teacher_id: 7,
      teacher_name: 'Ada Lovelace',
      subject_name: 'English',
      student_count: 14,
    });
  });

  it('applies room, teacher, and subject filters together', () => {
    const rows = enrichSchedule(
      assignments,
      [{ class_id: 11, teacher_id: 7, subject_id: 9, subject_name: 'English' }],
      [{ teacher_id: 7, full_name: 'Ada Lovelace' }],
    );
    const base = { date: '2026-08-10', start: '09:00', end: '10:00' };

    expect(filterSchedule(rows, { ...base, room: 'Room 101', teacherId: '7', subject: '9' })).toHaveLength(1);
    expect(filterSchedule(rows, { ...base, room: 'Room 102', teacherId: '7', subject: '9' })).toEqual([]);
    expect(filterSchedule(rows, { ...base, room: '', teacherId: '8', subject: '' })).toEqual([]);
  });

  it('keeps unassigned physical rooms visible and reports interval availability', () => {
    const schedule = enrichSchedule(assignments, [{ class_id: 11 }], []);
    const duringLesson = deriveAvailability(assignments, schedule, {
      date: '2026-08-10', start: '09:30', end: '09:45', room: '', teacherId: '', subject: '',
    });

    expect(duringLesson).toEqual([
      expect.objectContaining({ roomNumber: 'Room 101', available: false, nextLesson: 'A1 Morning' }),
      expect.objectContaining({ roomNumber: 'Room 102', available: true, nextLesson: 'No more lessons' }),
    ]);

    const afterLesson = deriveAvailability(assignments, schedule, {
      date: '2026-08-10', start: '10:00', end: '11:00', room: '', teacherId: '', subject: '',
    });
    expect(afterLesson.find((room) => room.roomNumber === 'Room 101')).toMatchObject({ available: true });
  });

  it('calculates utilization from booked minutes while counting each room once', () => {
    const result = deriveUtilization([
      ...assignments,
      { room_id: 3, room_number: 'Room 101', class_id: 12, day: 'Wednesday', time: '10:00', end_time: '11:30' },
    ]);

    expect(result).toHaveLength(2);
    expect(result.find((room) => room.roomNumber === 'Room 101')).toEqual({
      roomNumber: 'Room 101', bookedMinutes: 150, availableMinutes: 5040, utilization: 3,
    });
    expect(result.find((room) => room.roomNumber === 'Room 102')?.utilization).toBe(0);
  });
});
