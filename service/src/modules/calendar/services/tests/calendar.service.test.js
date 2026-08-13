jest.mock('../../repositories/calendar.repository', () => ({
  datedSessions: jest.fn(),
  resources: jest.fn(),
  recurringDefinitions: jest.fn(),
}));
jest.mock('../../../rooms/services/room-insights.service', () => ({ getSchedule: jest.fn(), getPhysicalRooms: jest.fn() }));

const repository = require('../../repositories/calendar.repository');
const roomInsights = require('../../../rooms/services/room-insights.service');
const service = require('../calendar.service');

const planned = (overrides = {}) => ({
  assignment_id: 9, schedule_date: '2026-08-10', start_time: '09:00', end_time: '10:00',
  class_id: 3, class_name: 'B1', teacher_id: 4, teacher_name: 'Ada Teacher',
  subject_id: 5, subject_name: 'English', physical_room_id: 6, room_name: 'Room 1', ...overrides,
});
const session = (overrides = {}) => ({
  session_id: 12, date: '2026-08-10', start_time: '09:00', end_time: '10:00',
  class_id: 3, class_name: 'B1', teacher_id: 4, teacher_name: 'Ada Teacher',
  subject_id: 5, subject_name: 'English', room_id: 6, room_name: 'Room 1',
  attendance_marked: 0, present: 0, absent: 0, student_count: 2, ...overrides,
});

describe('calendar service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    repository.recurringDefinitions.mockResolvedValue([]);
    roomInsights.getPhysicalRooms.mockResolvedValue([{ room_id: 6, name: 'Room 1', status: 'active' }]);
  });

  test.each([
    [{ from: '', to: '2026-08-10' }, /YYYY-MM-DD/],
    [{ from: '2026-08-11', to: '2026-08-10' }, /on or after/],
    [{ from: '2026-01-01', to: '2026-04-01' }, /62 days/],
  ])('rejects an unsafe event range %#', async (query, error) => {
    await expect(service.events(2, query)).rejects.toThrow(error);
    expect(repository.datedSessions).not.toHaveBeenCalled();
  });

  test('expands each date and lets a dated session replace its recurring class occurrence', async () => {
    repository.datedSessions.mockResolvedValue([session()]);
    roomInsights.getSchedule
      .mockResolvedValueOnce([planned({ schedule_date: '2026-08-10' })])
      .mockResolvedValueOnce([planned({ assignment_id: 10, schedule_date: '2026-08-11' })]);

    const rows = await service.events(2, { from: '2026-08-10', to: '2026-08-11' });

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: 'planned-10-2026-08-11', source: 'recurring', status: 'planned' }),
      expect.objectContaining({ event_id: 'session-12', source: 'session', status: 'ready', attendance: { present: 0, absent: 0, unmarked: 2 } }),
    ]));
    expect(repository.datedSessions).toHaveBeenCalledWith(2, '2026-08-10', '2026-08-11', {});
    expect(roomInsights.getSchedule).toHaveBeenNthCalledWith(1, 2, { date: '2026-08-10', teacher_id: undefined, subject_id: undefined, room_id: undefined });
  });

  test.each([
    [{ attendance_marked: 0 }, 'ready'],
    [{ attendance_marked: 1, present: 1 }, 'in_progress'],
    [{ attendance_marked: 2, present: 1, absent: 1 }, 'conducted'],
  ])('derives session status and attendance summary %#', async (changes, status) => {
    repository.datedSessions.mockResolvedValue([session(changes)]);
    roomInsights.getSchedule.mockResolvedValue([]);
    await expect(service.events(2, { from: '2026-08-10', to: '2026-08-10' })).resolves.toEqual([
      expect.objectContaining({ status, attendance: expect.objectContaining({ unmarked: 2 - changes.attendance_marked }) }),
    ]);
  });

  test('applies resource and status filters without dropping center/teacher scope', async () => {
    repository.datedSessions.mockResolvedValue([session()]);
    roomInsights.getSchedule.mockResolvedValue([]);
    await expect(service.events(7, {
      from: '2026-08-10', to: '2026-08-10', teacher_id: '4', class_id: '3',
      subject_id: '5', room_id: '6', status: 'ready',
    })).resolves.toHaveLength(1);
    expect(repository.datedSessions).toHaveBeenCalledWith(7, '2026-08-10', '2026-08-10', {});
    expect(roomInsights.getSchedule).toHaveBeenCalledWith(7, { date: '2026-08-10', teacher_id: 4, subject_id: 5, room_id: 6 });
  });

  test('summarizes lifecycle and incomplete attendance', async () => {
    repository.datedSessions.mockResolvedValue([
      session({ session_id: 1 }),
      session({ session_id: 2, class_id: 8, attendance_marked: 2, present: 2 }),
    ]);
    roomInsights.getSchedule.mockResolvedValue([planned({ class_id: 10 })]);
    await expect(service.summary(2, { from: '2026-08-10', to: '2026-08-10' })).resolves.toEqual({
      total: 3, planned: 1, ready: 1, in_progress: 0, conducted: 1, attendance_missing: 1,
    });
  });

  test('reports each overlapping resource conflict once', async () => {
    repository.datedSessions.mockResolvedValue([
      session({ session_id: 1, class_id: 3, teacher_id: 4, room_id: 6 }),
      session({ session_id: 2, class_id: 3, teacher_id: 4, room_id: 6, start_time: '09:30', end_time: '10:30' }),
      session({ session_id: 3, class_id: 9, teacher_id: 10, room_id: 11, start_time: '10:30', end_time: '11:30' }),
    ]);
    roomInsights.getSchedule.mockResolvedValue([]);
    await expect(service.conflicts(2, { from: '2026-08-10', to: '2026-08-10' })).resolves.toEqual([
      { event_ids: ['session-1', 'session-2'], reasons: ['room', 'teacher', 'group'] },
    ]);
  });

  test('ignores malformed class schedules and expands a valid section fallback', async () => {
    repository.datedSessions.mockResolvedValue([]);
    repository.recurringDefinitions.mockResolvedValue([
      { class_id: 20, class_name: 'Broken', section: '{bad json' },
      { class_id: 21, class_name: 'Fallback', room_name: 'Room 1', section: JSON.stringify({ days: ['Mon'], time: '13:00', endTime: '14:00' }), teacher_id: 4 },
    ]);
    roomInsights.getSchedule.mockResolvedValue([]);
    await expect(service.events(2, { from: '2026-08-10', to: '2026-08-10' })).resolves.toEqual([
      expect.objectContaining({ event_id: 'planned-class-21-2026-08-10', class_id: 21, start_time: '13:00', end_time: '14:00' }),
    ]);
  });

  test('does not duplicate a class-section fallback already projected by Rooms', async () => {
    repository.datedSessions.mockResolvedValue([]);
    repository.recurringDefinitions.mockResolvedValue([
      { class_id: 3, class_name: 'B1', section: JSON.stringify({ days: ['Monday'], time: '09:00', endTime: '10:00' }) },
    ]);
    roomInsights.getSchedule.mockResolvedValue([planned()]);
    const rows = await service.events(2, { from: '2026-08-10', to: '2026-08-10' });
    expect(rows).toHaveLength(1);
    expect(rows[0].event_id).toBe('planned-9-2026-08-10');
  });

  test('excludes deleted, unknown, inactive, and maintenance rooms from calendar events', async () => {
    repository.datedSessions.mockResolvedValue([
      session({ session_id: 1, room_id: 6, room_name: 'Room 1' }),
      session({ session_id: 2, room_id: 34, room_name: '34' }),
    ]);
    repository.recurringDefinitions.mockResolvedValue([
      { class_id: 20, class_name: 'Legacy 403', room_name: '403', section: JSON.stringify({ days: ['Monday'], time: '11:00', endTime: '12:00' }) },
    ]);
    roomInsights.getSchedule.mockResolvedValue([planned({ assignment_id: 22, physical_room_id: 8, room_name: 'Maintenance' })]);
    roomInsights.getPhysicalRooms.mockResolvedValue([
      { room_id: 6, name: 'Room 1', status: 'active' },
      { room_id: 8, name: 'Maintenance', status: 'maintenance' },
    ]);

    const rows = await service.events(2, { from: '2026-08-10', to: '2026-08-10' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(expect.objectContaining({ event_id: 'session-1', room_id: 6, room_name: 'Room 1' }));
  });
});
