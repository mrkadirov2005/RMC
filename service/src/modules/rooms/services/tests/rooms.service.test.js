jest.mock('../../repositories/rooms.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), findConflict: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(),
}));

const repository = require('../../repositories/rooms.repository');
const service = require('../rooms.service');

describe('rooms service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('scopes list, detail, and delete operations to a center', async () => {
    await service.getAllRooms(2); await service.getRoomById(1, 2); await service.deleteRoom(1, 2);
    expect(repository.findAll).toHaveBeenCalledWith(2);
    expect(repository.findById).toHaveBeenCalledWith(1, 2);
    expect(repository.remove).toHaveBeenCalledWith(1, 2);
  });

  test.each([
    ['bad', undefined],
    ['10:00', '09:00'],
    ['10:00', '10:00'],
  ])('rejects invalid or non-increasing time window %s-%s', async (time, end_time) => {
    await expect(service.createRoom({ center_id: 2, room_number: 'A', day: 'Monday', time, end_time }))
      .resolves.toEqual({ error: 'bad_time_window' });
    expect(repository.findConflict).not.toHaveBeenCalled();
  });

  test('defaults room duration to one hour and inserts an available window', async () => {
    repository.findConflict.mockResolvedValue(null);
    await service.createRoom({ center_id: 2, room_number: 'A', class_id: 7, day: 'Monday', time: '09:15' });
    expect(repository.findConflict).toHaveBeenCalledWith(2, 'A', 'Monday', '09:15', '10:15');
    expect(repository.insert).toHaveBeenCalledWith([2, 'A', 7, 'Monday', '09:15', '10:15']);
  });

  test('returns the conflicting room without inserting', async () => {
    const conflict = { roomId: 9 };
    repository.findConflict.mockResolvedValue(conflict);
    await expect(service.createRoom({ center_id: 2, room_number: 'A', day: 'Monday', time: '09:00', end_time: '10:00' }))
      .resolves.toEqual({ error: 'room_unavailable', conflict });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('excludes the current room when checking update conflicts', async () => {
    repository.findConflict.mockResolvedValue(null);
    await service.updateRoom(8, { room_number: 'A', day: 'Monday', time: '09:00', end_time: '10:00' }, 2);
    expect(repository.findConflict).toHaveBeenCalledWith(2, 'A', 'Monday', '09:00', '10:00', 8);
    expect(repository.update).toHaveBeenCalledWith(8, ['A', null, 'Monday', '09:00', '10:00'], 2);
  });
});
