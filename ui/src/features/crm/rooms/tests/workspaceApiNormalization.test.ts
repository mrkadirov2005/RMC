import { describe, expect, it } from 'vitest';
import {
  normalizeAvailabilityRows,
  normalizeScheduleRows,
  normalizeUtilizationRows,
} from '../hooks/useRoomsWorkspace';

describe('rooms workspace API normalization', () => {
  it('normalizes the backend schedule snake_case contract', () => {
    expect(normalizeScheduleRows([{
      assignment_id: 13,
      physical_room_id: 4,
      room_name: 'Room 101',
      start_time: '09:00:00',
      end_time: '10:00:00',
      teacher_id: 7,
      subject_id: 9,
    }])).toEqual([expect.objectContaining({
      room_id: 13,
      room_number: 'Room 101',
      time: '09:00:00',
      end_time: '10:00:00',
      teacher_id: 7,
      subject_id: 9,
    })]);
  });

  it('normalizes physical room availability and preserves backend identity', () => {
    expect(normalizeAvailabilityRows([{
      room_id: 4,
      name: 'Room 101',
      available: false,
    }], [])).toEqual([{
      roomId: 4,
      roomNumber: 'Room 101',
      available: false,
      nextLesson: 'No lesson details',
      freeUntil: 'End of day',
      assignment: undefined,
    }]);
  });

  it('normalizes numeric utilization fields returned as PostgreSQL strings', () => {
    expect(normalizeUtilizationRows([{
      name: 'Room 101',
      booked_minutes: '150',
      available_minutes: '600',
      utilization_percent: '25.0',
    }])).toEqual([{
      roomNumber: 'Room 101',
      bookedMinutes: 150,
      availableMinutes: 600,
      utilization: 25,
    }]);
  });
});
