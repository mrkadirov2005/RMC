jest.mock('../../services/room-slots.service', () => ({
  getSlotsByRoom: jest.fn(),
  getSlotsByCenter: jest.fn(),
  getAvailableSlots: jest.fn(),
  addSlot: jest.fn(),
  addMultipleSlots: jest.fn(),
  generateSlots: jest.fn(),
  modifySlot: jest.fn(),
  removeSlot: jest.fn(),
  getBookingsBySlot: jest.fn(),
  getBookingsByClass: jest.fn(),
  getBookingsByRoom: jest.fn(),
  bookSlot: jest.fn(),
  modifyBooking: jest.fn(),
  cancelBooking: jest.fn(),
}));

jest.mock('../../../../shared/tenant', () => ({
  getScopedCenterId: jest.fn(),
}));

const controller = require('../room-slots.controller');
const service = require('../../services/room-slots.service');
const { getScopedCenterId } = require('../../../../shared/tenant');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const admin = { userType: 'admin', id: 1 };

const allHandlers = [
  ['getSlotsByRoom', { params: { roomId: '2' }, query: {} }],
  ['getSlotsByCenter', { query: {} }],
  ['getAvailableSlots', { params: { roomId: '2' }, query: { slot_date: '2026-09-01' } }],
  ['createSlot', { body: {} }],
  ['createMultipleSlots', { body: { slots: [] } }],
  ['generateSlotsForDateRange', { body: {} }],
  ['updateSlot', { params: { slotId: '5' }, body: {} }],
  ['deleteSlot', { params: { slotId: '5' } }],
  ['getBookingsBySlot', { params: { slotId: '5' } }],
  ['getBookingsByClass', { params: { classId: '3' } }],
  ['getBookingsByRoom', { params: { roomId: '2' }, query: {} }],
  ['createBooking', { body: {} }],
  ['updateBooking', { params: { bookingId: '6' }, body: {} }],
  ['cancelBooking', { params: { bookingId: '6' } }],
];

describe('room slots controller', () => {
  beforeEach(() => {
    getScopedCenterId.mockReturnValue({ centerId: 4, isGlobal: false });
  });

  describe('center scoping applies to every handler', () => {
    it.each(allHandlers)('%s refuses a request with no center scope', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: false });
      const res = createResponse();

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Center scope required.' });
    });

    it.each(allHandlers)('%s makes a superuser name a center', async (handler, req) => {
      getScopedCenterId.mockReturnValue({ centerId: null, isGlobal: true });
      const res = createResponse();

      await controller[handler]({ ...req, user: { userType: 'superuser' } }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'center_id is required for superuser actions.' });
    });
  });

  describe('slot reads', () => {
    it('passes the room and date window through', async () => {
      const res = createResponse();
      service.getSlotsByRoom.mockResolvedValue([{ slot_id: 1 }]);

      await controller.getSlotsByRoom({
        params: { roomId: '2' },
        query: { from_date: '2026-09-01', to_date: '2026-09-30' },
        user: admin,
      }, res);

      expect(service.getSlotsByRoom).toHaveBeenCalledWith('2', 4, '2026-09-01', '2026-09-30');
      expect(res.json).toHaveBeenCalledWith([{ slot_id: 1 }]);
    });

    it('lists every slot in the center', async () => {
      const res = createResponse();
      service.getSlotsByCenter.mockResolvedValue([]);

      await controller.getSlotsByCenter({ query: { from_date: '2026-09-01' }, user: admin }, res);

      expect(service.getSlotsByCenter).toHaveBeenCalledWith(4, '2026-09-01', undefined);
    });

    it('requires a date before listing free slots', async () => {
      const res = createResponse();

      await controller.getAvailableSlots({ params: { roomId: '2' }, query: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Slot date is required' });
      expect(service.getAvailableSlots).not.toHaveBeenCalled();
    });

    it('lists the free slots for a given day', async () => {
      const res = createResponse();
      service.getAvailableSlots.mockResolvedValue([{ slot_id: 3 }]);

      await controller.getAvailableSlots({
        params: { roomId: '2' },
        query: { slot_date: '2026-09-01' },
        user: admin,
      }, res);

      expect(service.getAvailableSlots).toHaveBeenCalledWith('2', 4, '2026-09-01');
      expect(res.json).toHaveBeenCalledWith([{ slot_id: 3 }]);
    });

    it.each([
      ['getSlotsByRoom', { params: { roomId: '2' }, query: {} }, 'getSlotsByRoom'],
      ['getSlotsByCenter', { query: {} }, 'getSlotsByCenter'],
      ['getAvailableSlots', { params: { roomId: '2' }, query: { slot_date: '2026-09-01' } }, 'getAvailableSlots'],
    ])('%s reports a service failure as a 500', async (handler, req, method) => {
      const res = createResponse();
      service[method].mockRejectedValue(new Error('offline'));

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'offline' });
    });
  });

  describe('slot writes', () => {
    it('defaults a slot to thirty minutes', async () => {
      const res = createResponse();
      service.addSlot.mockResolvedValue({ slot_id: 1 });

      await controller.createSlot({
        body: { room_id: 2, slot_date: '2026-09-01', start_time: '09:00', end_time: '09:30' },
        user: admin,
      }, res);

      expect(service.addSlot).toHaveBeenCalledWith(expect.objectContaining({ center_id: 4, duration_minutes: 30 }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('honours an explicit slot length', async () => {
      const res = createResponse();
      service.addSlot.mockResolvedValue({});

      await controller.createSlot({ body: { room_id: 2, duration_minutes: 45 }, user: admin }, res);

      expect(service.addSlot).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 45 }));
    });

    it('stamps the scoped center onto every slot in a batch', async () => {
      const res = createResponse();
      service.addMultipleSlots.mockResolvedValue([{ slot_id: 1 }, { slot_id: 2 }]);

      await controller.createMultipleSlots({
        body: { slots: [{ room_id: 2, center_id: 999 }, { room_id: 3 }] },
        user: admin,
      }, res);

      expect(service.addMultipleSlots).toHaveBeenCalledWith([
        { room_id: 2, center_id: 4 },
        { room_id: 3, center_id: 4 },
      ]);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('reports how many slots a date range produced', async () => {
      const res = createResponse();
      service.generateSlots.mockResolvedValue([{ slot_id: 1 }, { slot_id: 2 }, { slot_id: 3 }]);

      await controller.generateSlotsForDateRange({
        body: { room_id: 2, start_date: '2026-09-01', end_date: '2026-09-07', slot_configs: [] },
        user: admin,
      }, res);

      expect(service.generateSlots).toHaveBeenCalledWith(2, 4, '2026-09-01', '2026-09-07', []);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ message: 'Generated 3 slots', slots: expect.any(Array) });
    });

    it('writes only the editable slot fields', async () => {
      const res = createResponse();
      service.modifySlot.mockResolvedValue({ slot_id: 5 });

      await controller.updateSlot({
        params: { slotId: '5' },
        body: { start_time: '10:00', end_time: '10:30', duration_minutes: 30, is_available: false, room_id: 99 },
        user: admin,
      }, res);

      expect(service.modifySlot).toHaveBeenCalledWith('5', {
        start_time: '10:00',
        end_time: '10:30',
        duration_minutes: 30,
        is_available: false,
      }, 4);
      expect(res.json).toHaveBeenCalledWith({ slot_id: 5 });
    });

    it('returns 404 when the slot is out of scope', async () => {
      const res = createResponse();
      service.modifySlot.mockResolvedValue(null);

      await controller.updateSlot({ params: { slotId: '5' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Slot not found' });
    });

    it('confirms a slot deletion', async () => {
      const res = createResponse();
      service.removeSlot.mockResolvedValue({ slot_id: 5 });

      await controller.deleteSlot({ params: { slotId: '5' }, user: admin }, res);

      expect(service.removeSlot).toHaveBeenCalledWith('5', 4);
      expect(res.json).toHaveBeenCalledWith({ message: 'Slot deleted successfully' });
    });

    it('returns 404 when the slot to delete is out of scope', async () => {
      const res = createResponse();
      service.removeSlot.mockResolvedValue(null);

      await controller.deleteSlot({ params: { slotId: '5' }, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it.each([
      ['createSlot', { body: {} }, 'addSlot'],
      ['createMultipleSlots', { body: { slots: [] } }, 'addMultipleSlots'],
      ['generateSlotsForDateRange', { body: {} }, 'generateSlots'],
      ['updateSlot', { params: { slotId: '5' }, body: {} }, 'modifySlot'],
      ['deleteSlot', { params: { slotId: '5' } }, 'removeSlot'],
    ])('%s reports a service failure as a 500', async (handler, req, method) => {
      const res = createResponse();
      service[method].mockRejectedValue(new Error('write failed'));

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'write failed' });
    });
  });

  describe('bookings', () => {
    it('lists the bookings against one slot', async () => {
      const res = createResponse();
      service.getBookingsBySlot.mockResolvedValue([{ booking_id: 1 }]);

      await controller.getBookingsBySlot({ params: { slotId: '5' }, user: admin }, res);

      expect(service.getBookingsBySlot).toHaveBeenCalledWith('5', 4);
      expect(res.json).toHaveBeenCalledWith([{ booking_id: 1 }]);
    });

    it('lists the bookings for one class', async () => {
      const res = createResponse();
      service.getBookingsByClass.mockResolvedValue([]);

      await controller.getBookingsByClass({ params: { classId: '3' }, user: admin }, res);

      expect(service.getBookingsByClass).toHaveBeenCalledWith('3', 4);
    });

    it('lists the bookings for one room over a date window', async () => {
      const res = createResponse();
      service.getBookingsByRoom.mockResolvedValue([]);

      await controller.getBookingsByRoom({
        params: { roomId: '2' },
        query: { from_date: '2026-09-01', to_date: '2026-09-30' },
        user: admin,
      }, res);

      expect(service.getBookingsByRoom).toHaveBeenCalledWith('2', 4, '2026-09-01', '2026-09-30');
    });

    it('books a slot under the scoped center', async () => {
      const res = createResponse();
      service.bookSlot.mockResolvedValue({ booking_id: 7 });

      await controller.createBooking({
        body: { slot_id: 5, class_id: 3, session_id: 9, teacher_id: 7, notes: 'Exam', center_id: 999 },
        user: admin,
      }, res);

      expect(service.bookSlot).toHaveBeenCalledWith({
        center_id: 4,
        slot_id: 5,
        class_id: 3,
        session_id: 9,
        teacher_id: 7,
        notes: 'Exam',
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('writes only the editable booking fields', async () => {
      const res = createResponse();
      service.modifyBooking.mockResolvedValue({ booking_id: 6 });

      await controller.updateBooking({
        params: { bookingId: '6' },
        body: { booking_status: 'Confirmed', notes: 'Moved', slot_id: 99 },
        user: admin,
      }, res);

      expect(service.modifyBooking).toHaveBeenCalledWith('6', { booking_status: 'Confirmed', notes: 'Moved' }, 4);
      expect(res.json).toHaveBeenCalledWith({ booking_id: 6 });
    });

    it('returns 404 when the booking is out of scope', async () => {
      const res = createResponse();
      service.modifyBooking.mockResolvedValue(null);

      await controller.updateBooking({ params: { bookingId: '6' }, body: {}, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Booking not found' });
    });

    it('confirms a cancellation', async () => {
      const res = createResponse();
      service.cancelBooking.mockResolvedValue(undefined);

      await controller.cancelBooking({ params: { bookingId: '6' }, user: admin }, res);

      expect(service.cancelBooking).toHaveBeenCalledWith('6', 4);
      expect(res.json).toHaveBeenCalledWith({ message: 'Booking cancelled successfully' });
    });

    it.each([
      ['getBookingsBySlot', { params: { slotId: '5' } }, 'getBookingsBySlot'],
      ['getBookingsByClass', { params: { classId: '3' } }, 'getBookingsByClass'],
      ['getBookingsByRoom', { params: { roomId: '2' }, query: {} }, 'getBookingsByRoom'],
      ['createBooking', { body: {} }, 'bookSlot'],
      ['updateBooking', { params: { bookingId: '6' }, body: {} }, 'modifyBooking'],
      ['cancelBooking', { params: { bookingId: '6' } }, 'cancelBooking'],
    ])('%s reports a service failure as a 500', async (handler, req, method) => {
      const res = createResponse();
      service[method].mockRejectedValue(new Error('booking failed'));

      await controller[handler]({ ...req, user: admin }, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'booking failed' });
    });
  });
});
