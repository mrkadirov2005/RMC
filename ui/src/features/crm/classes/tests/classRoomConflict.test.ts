import { describe, expect, it } from 'vitest';
import { findClassRoomConflict } from '../classRoomConflict';

const existing = { class_id: 4, class_name: 'B1 Intro', room_number: 'Room 2', section: JSON.stringify({ days: ['Monday'], time: '09:00', endTime: '10:30' }) };

describe('class room conflicts', () => {
  it('rejects overlapping lessons in the same room and day', () => {
    expect(findClassRoomConflict({ classes: [existing], assignments: [], room: 'room 2', days: ['Monday'], start: '10:00', end: '11:00' }))
      .toEqual({ day: 'Monday', start: '09:00', end: '10:30', group: 'B1 Intro' });
  });

  it('allows adjacent lessons and excludes the class being edited', () => {
    expect(findClassRoomConflict({ classes: [existing], assignments: [], room: 'Room 2', days: ['Monday'], start: '10:30', end: '11:30' })).toBeNull();
    expect(findClassRoomConflict({ classes: [existing], assignments: [], room: 'Room 2', days: ['Monday'], start: '09:30', end: '10:00', editingId: 4 })).toBeNull();
  });

  it('detects legacy room assignments too', () => {
    expect(findClassRoomConflict({ classes: [], assignments: [{ room_number: 'Room 3', day: 'Friday', time: '14:00', end_time: '15:30', class_name: 'Kids' }], room: 'Room 3', days: ['Friday'], start: '15:00', end: '16:00' })?.group).toBe('Kids');
  });
});
