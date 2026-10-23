import { describe, expect, it } from 'vitest';
import { buildAssignedClassGroups, buildRoomGroups, buildRoomPayload, filterClassesByTeacher, normalizeRoomAssignments } from '../roomModel';

describe('room management model', () => {
  it('keeps an unassigned room visible without counting it as a class assignment', () => {
    const [room] = buildRoomGroups([{ room_id: 1, room_number: 'Room 1', class_id: null }]);
    expect(room.roomNumber).toBe('Room 1');
    expect(room.assignmentCount).toBe(0);
    expect(room.classCount).toBe(0);
  });

  it('groups every scheduled slot under its actual class name', () => {
    const rooms = buildRoomGroups([
      { room_id: 1, room_number: 'Room 1', class_id: 7, class_name: 'A2 Flyers', day: 'Monday' },
      { room_id: 2, room_number: 'Room 1', class_id: 7, class_name: 'A2 Flyers', day: 'Wednesday' },
    ]);
    const classes = buildAssignedClassGroups(rooms[0].assignments);
    expect(classes).toEqual([{ id: 7, name: 'A2 Flyers', assignments: expect.any(Array) }]);
    expect(classes[0].assignments).toHaveLength(2);
  });

  it('shows only groups belonging to the selected teacher', () => {
    const classes = [
      { class_id: 1, teacher_id: 10, class_name: 'A1' },
      { class_id: 2, teacher_id: 20, class_name: 'B2' },
    ];
    expect(filterClassesByTeacher(classes, '20')).toEqual([classes[1]]);
    expect(filterClassesByTeacher(classes, '')).toEqual([]);
  });

  it('normalizes the camelCase room response returned by the API', () => {
    expect(normalizeRoomAssignments([{
      roomId: 9,
      roomNumber: 'Room 12',
      classId: 3,
      className: 'IELTS Evening',
      endTime: '11:00',
    }])).toEqual([expect.objectContaining({
      room_id: 9,
      room_number: 'Room 12',
      class_id: 3,
      class_name: 'IELTS Evening',
      end_time: '11:00',
    })]);
  });
});

describe('room form request', () => {
  const form = { room_number: '5', nickname: 'Katta zal', capacity: '20', class_id: '7', day: 'Monday', days: ['Monday', 'Wednesday', 'Friday'], time: '15:00', end_time: '16:30' };

  it('sends a new lesson on several days as one request with the days', () => {
    expect(buildRoomPayload(form, { editing: false, mode: 'assignment' })).toEqual({
      room_number: '5', nickname: 'Katta zal', capacity: 20, class_id: 7, day: 'Monday', days: ['Monday', 'Wednesday', 'Friday'], time: '15:00', end_time: '16:30',
    });
  });

  it('sends one day as the plain day, and a room without a group with no group', () => {
    expect(buildRoomPayload({ ...form, days: ['Tuesday'], day: 'Monday' }, { editing: false, mode: 'assignment' })).toMatchObject({ day: 'Tuesday' });
    expect(buildRoomPayload({ ...form, days: ['Tuesday'], day: 'Monday' }, { editing: false, mode: 'assignment' })).not.toHaveProperty('days');
    expect(buildRoomPayload({ ...form, class_id: '', capacity: '' }, { editing: false, mode: 'room' })).toMatchObject({ class_id: null, capacity: undefined, day: 'Monday' });
    expect(buildRoomPayload({ ...form, days: [] }, { editing: false, mode: 'assignment' })).toMatchObject({ day: 'Monday' });
  });

  it('edits one lesson on its own day', () => {
    const edited = buildRoomPayload({ ...form, day: 'Friday', days: ['Friday'] }, { editing: true, mode: 'assignment' });
    expect(edited).toMatchObject({ day: 'Friday', class_id: 7 });
    expect(edited).not.toHaveProperty('days');
  });
});
