jest.mock('../../repositories/rooms.repository', () => ({
  findAll: jest.fn(), findById: jest.fn(), findConflict: jest.fn(), insert: jest.fn(), update: jest.fn(), remove: jest.fn(), setClassRoomNumber: jest.fn(),
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
    repository.insert.mockResolvedValue({ room_id: 1, class_id: 7 });
    await service.createRoom({ center_id: 2, room_number: 'A', class_id: 7, day: 'Monday', time: '09:15' });
    expect(repository.findConflict).toHaveBeenCalledWith(2, 'A', 'Monday', '09:15', '10:15');
    expect(repository.insert).toHaveBeenCalledWith([2, 'A', 7, 'Monday', '09:15', '10:15']);
    expect(repository.setClassRoomNumber).toHaveBeenCalledWith(7, 2, 'A');
  });

  test('returns the conflicting room without inserting', async () => {
    const conflict = { roomId: 9 };
    repository.findConflict.mockResolvedValue(conflict);
    await expect(service.createRoom({ center_id: 2, room_number: 'A', day: 'Monday', time: '09:00', end_time: '10:00' }))
      .resolves.toEqual({ error: 'room_unavailable', conflict, day: 'Monday' });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  test('puts a group in the room on several days at once, one lesson per day', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.insert.mockImplementation(async (params) => ({ room_id: params[3].length, day: params[3] }));
    const out = await service.createRoom({
      center_id: 2, room_number: '5', nickname: 'Katta zal', class_id: 7, day: 'Monday', days: ['Wednesday', 'Friday', 'monday'], time: '15:00', end_time: '16:30', capacity: 20,
    });
    expect(repository.findConflict.mock.calls.map((call) => call[2])).toEqual(['Monday', 'Wednesday', 'Friday']);
    expect(repository.insert.mock.calls.map((call) => call[0])).toEqual([
      [2, '5', 7, 'Monday', '15:00', '16:30', 20, 'Katta zal'],
      [2, '5', 7, 'Wednesday', '15:00', '16:30', 20, 'Katta zal'],
      [2, '5', 7, 'Friday', '15:00', '16:30', 20, 'Katta zal'],
    ]);
    expect(out.rooms).toHaveLength(3);
    expect(repository.setClassRoomNumber).toHaveBeenCalledTimes(1);
  });

  test('saves none of the days when one of them is taken, and says which', async () => {
    repository.findConflict.mockResolvedValueOnce(null).mockResolvedValueOnce({ roomId: 4 });
    const out = await service.createRoom({ center_id: 2, room_number: '5', class_id: 7, day: 'Monday', days: ['Wednesday', 'Friday'], time: '15:00', end_time: '16:30' });
    expect(out).toEqual({ error: 'room_unavailable', conflict: { roomId: 4 }, day: 'Wednesday' });
    expect(repository.insert).not.toHaveBeenCalled();
    expect(repository.setClassRoomNumber).not.toHaveBeenCalled();
  });

  test('excludes the current room when checking update conflicts', async () => {
    repository.findConflict.mockResolvedValue(null);
    await service.updateRoom(8, { room_number: 'A', day: 'Monday', time: '09:00', end_time: '10:00' }, 2);
    expect(repository.findConflict).toHaveBeenCalledWith(2, 'A', 'Monday', '09:00', '10:00', 8);
    expect(repository.update).toHaveBeenCalledWith(8, ['A', null, 'Monday', '09:00', '10:00'], 2);
  });

  test('saves an updated room assignment into the classes room_number field', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.update.mockResolvedValue({ room_id: 8, class_id: 7 });
    await service.updateRoom(8, { room_number: 'Room 2', class_id: 7, day: 'Friday', time: '10:00', end_time: '11:00' }, 2);
    expect(repository.setClassRoomNumber).toHaveBeenCalledWith(7, 2, 'Room 2');
  });
});
