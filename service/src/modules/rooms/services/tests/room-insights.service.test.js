jest.mock('../../repositories/room-insights.repository', () => ({
  schedule: jest.fn(),
  physicalRooms: jest.fn(),
  availability: jest.fn(),
  utilization: jest.fn(),
  updatePhysicalRoom: jest.fn(),
}));

const repository = require('../../repositories/room-insights.repository');
const service = require('../room-insights.service');

describe('room insights service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('builds a center-scoped overview from rooms, availability, and schedule', async () => {
    repository.physicalRooms.mockResolvedValue([{ room_id: 1 }, { room_id: 2 }]);
    repository.availability.mockResolvedValue([{ room_id: 1, available: true }, { room_id: 2, available: false }]);
    repository.schedule.mockResolvedValue([{ assignment_id: 8 }, { assignment_id: 9 }]);

    await expect(service.getOverview(4, { date: '2026-08-10', start: '09:00', end: '11:00' })).resolves.toEqual(
      expect.objectContaining({
        date: '2026-08-10',
        summary: { total_rooms: 2, available_rooms: 1, occupied_rooms: 1, scheduled_lessons: 2 },
      }),
    );
    expect(repository.physicalRooms).toHaveBeenCalledWith(4);
    expect(repository.availability).toHaveBeenCalledWith(4, '2026-08-10', '09:00', '11:00');
    expect(repository.schedule).toHaveBeenCalledWith(4, { date: '2026-08-10' });
  });

  test.each([
    [{ date: '08/10/2026', start: '09:00', end: '10:00' }, /date must use YYYY-MM-DD/],
    [{ date: '2026-08-10', start: '9:00', end: '10:00' }, /start must use HH:mm/],
    [{ date: '2026-08-10', start: '10:00', end: '10:00' }, /end must be after start/],
    [{ date: '2026-08-10', start: '11:00', end: '10:00' }, /end must be after start/],
  ])('rejects an invalid availability interval %#', (query, message) => {
    expect(() => service.getAvailability(4, query)).toThrow(message);
    expect(repository.availability).not.toHaveBeenCalled();
  });

  test('passes normalized interval values to the center-scoped availability query', async () => {
    repository.availability.mockResolvedValue([]);
    await service.getAvailability(4, { date: '2026-08-10', start: '09:00:00', end: '10:30:00' });
    expect(repository.availability).toHaveBeenCalledWith(4, '2026-08-10', '09:00', '10:30');
  });

  test('normalizes schedule filters without losing center scoping', async () => {
    repository.schedule.mockResolvedValue([]);
    await service.getSchedule(4, {
      date: '2026-08-10', from: '2026-08-01', to: '2026-08-31',
      room_id: '3', teacher_id: '7', subject_id: '9',
    });
    expect(repository.schedule).toHaveBeenCalledWith(4, {
      date: '2026-08-10', from: '2026-08-01', to: '2026-08-31', roomId: 3, teacherId: 7, subjectId: 9,
    });
  });

  test.each([
    ['getByTeacher', 'teacher', 'teacher_id', 'teacher_name'],
    ['getBySubject', 'subject', 'subject_id', 'subject_name'],
  ])('groups schedule rows for %s including an explicit unassigned group', async (method, key, idKey, nameKey) => {
    repository.schedule.mockResolvedValue([
      { [idKey]: 7, [nameKey]: `Named ${key}`, assignment_id: 1 },
      { [idKey]: 7, [nameKey]: `Named ${key}`, assignment_id: 2 },
      { [idKey]: null, [nameKey]: null, assignment_id: 3 },
    ]);

    await expect(service[method](4, { date: '2026-08-10' })).resolves.toEqual([
      { [idKey]: 7, [nameKey]: `Named ${key}`, bookings: [expect.objectContaining({ assignment_id: 1 }), expect.objectContaining({ assignment_id: 2 })] },
      { [idKey]: null, [nameKey]: `Unassigned ${key}`, bookings: [expect.objectContaining({ assignment_id: 3 })] },
    ]);
    expect(repository.schedule).toHaveBeenCalledWith(4, expect.objectContaining({ date: '2026-08-10' }));
  });

  test('validates report ranges before requesting utilization', async () => {
    expect(() => service.getReport(4, { from: '2026-08-31', to: '2026-08-01' }))
      .toThrow('to must be on or after from');
    expect(repository.utilization).not.toHaveBeenCalled();

    repository.utilization.mockResolvedValue([{ room_id: 1, utilization_percent: '25.0' }]);
    await service.getReport(4, { from: '2026-08-01', to: '2026-08-31' });
    expect(repository.utilization).toHaveBeenCalledWith(4, '2026-08-01', '2026-08-31');
  });

  test('rejects invalid physical-room metadata before persistence', () => {
    expect(() => service.updatePhysicalRoom(1, 4, { capacity: 0 })).toThrow('capacity must be a positive integer');
    expect(() => service.updatePhysicalRoom(1, 4, { features: 'projector' })).toThrow('features must be an array');
    expect(() => service.updatePhysicalRoom(1, 4, { status: 'booked' })).toThrow('status must be active, inactive, or maintenance');
    expect(repository.updatePhysicalRoom).not.toHaveBeenCalled();
  });
});
