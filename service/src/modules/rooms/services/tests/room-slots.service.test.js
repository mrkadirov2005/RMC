jest.mock('../../repositories/room-slots.repository', () => ({
  findSlotsByRoom: jest.fn(), findSlotsByCenter: jest.fn(), findSlotById: jest.fn(), findAvailableSlots: jest.fn(),
  createSlot: jest.fn(), createMultipleSlots: jest.fn(), updateSlot: jest.fn(), deleteSlot: jest.fn(),
  findBookingsBySlot: jest.fn(), findBookingsByClass: jest.fn(), findBookingsByRoom: jest.fn(), findBookingById: jest.fn(),
  createBooking: jest.fn(), markSlotAsBooked: jest.fn(), updateBooking: jest.fn(), deleteBooking: jest.fn(), markSlotAsAvailable: jest.fn(),
  bookSlotAtomic: jest.fn(), cancelBookingAtomic: jest.fn(),
}));

const repository = require('../../repositories/room-slots.repository');
const service = require('../room-slots.service');

describe('room slot service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('scopes slot queries and mutations to center', async () => {
    await service.getSlotsByRoom(1, 2, '2026-08-01', '2026-08-31');
    await service.getSlotsByCenter(2); await service.getSlotById(3, 2);
    await service.getAvailableSlots(1, 2, '2026-08-08'); await service.removeSlot(3, 2);
    expect(repository.findSlotsByRoom).toHaveBeenCalledWith(1, 2, '2026-08-01', '2026-08-31');
    expect(repository.findSlotsByCenter).toHaveBeenCalledWith(2, undefined, undefined);
    expect(repository.findSlotById).toHaveBeenCalledWith(3, 2);
    expect(repository.findAvailableSlots).toHaveBeenCalledWith(1, 2, '2026-08-08');
    expect(repository.deleteSlot).toHaveBeenCalledWith(3, 2);
  });

  test('creates and updates slots with safe defaults', async () => {
    await service.addSlot({ center_id: 2, room_id: 1, slot_date: '2026-08-08', start_time: '09:00', end_time: '09:30' });
    expect(repository.createSlot).toHaveBeenCalledWith([2, 1, '2026-08-08', '09:00', '09:30', 30]);
    await service.modifySlot(3, { start_time: '10:00', end_time: '10:45', is_available: false }, 2);
    expect(repository.updateSlot).toHaveBeenCalledWith(3, ['10:00', '10:45', 30, false], 2);
  });

  test('generates only configured weekday slots over an inclusive range', async () => {
    repository.createMultipleSlots.mockImplementation(async (slots) => slots);
    const result = await service.generateSlots(1, 2, '2026-08-03', '2026-08-05', [
      { day: 'Monday', slots: ['09:00', '09:30'] },
      { day: 'Wednesday', slots: ['23:45'] },
    ]);
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ slot_date: '2026-08-03', start_time: '09:00', end_time: '09:30' }),
      expect.objectContaining({ slot_date: '2026-08-05', start_time: '23:45', end_time: '24:15' }),
    ]));
  });

  test('books a slot and marks it unavailable', async () => {
    repository.bookSlotAtomic.mockResolvedValue({ booking_id: 7 });
    await expect(service.bookSlot({ center_id: 2, slot_id: 3, class_id: 4 })).resolves.toEqual({ booking_id: 7 });
    expect(repository.bookSlotAtomic).toHaveBeenCalledWith([2, 3, 4, null, null, 'Confirmed', null]);
  });

  test('cancels an existing booking and restores slot availability', async () => {
    repository.cancelBookingAtomic.mockResolvedValue({ booking_id: 7, slot_id: 3 });
    await expect(service.cancelBooking(7, 2)).resolves.toEqual({ booking_id: 7, slot_id: 3 });
    expect(repository.cancelBookingAtomic).toHaveBeenCalledWith(7, 2);
  });

  test('does not mutate slot state when cancellation target is absent', async () => {
    repository.cancelBookingAtomic.mockRejectedValue(new Error('Booking not found'));
    await expect(service.cancelBooking(7, 2)).rejects.toThrow('Booking not found');
  });
});
