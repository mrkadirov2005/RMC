// RMC-036 / Critical Finding #2: rooms, room-slots, and room-insights
// controllers used to trust req.query.center_id / req.body.center_id
// directly, letting any authenticated caller read or write another center's
// rooms/slots/bookings just by supplying a different center_id. The fix
// introduced a resolveCenter(req, res) helper in each controller that wraps
// getScopedCenterId — for a non-global caller (teacher, or a superuser who
// is not an owner) the caller's OWN center id from their JWT (req.user) is
// used no matter what center_id shows up in the query string or body; only a
// global user (owner) may still override it.
//
// We deliberately do NOT mock shared/tenant here (unlike most controller
// tests, which mock getScopedCenterId directly) — the whole point of this
// suite is to prove the real controller + real tenant-scoping composition
// rejects spoofing, not just that the controller calls some mock correctly.
jest.mock('../../services/rooms.service', () => ({
  getAllRooms: jest.fn(),
  getRoomById: jest.fn(),
  createRoom: jest.fn(),
  updateRoom: jest.fn(),
  deleteRoom: jest.fn(),
}));
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
jest.mock('../../services/room-insights.service', () => ({
  getPhysicalRooms: jest.fn(),
  updatePhysicalRoom: jest.fn(),
  deletePhysicalRoom: jest.fn(),
  getOverview: jest.fn(),
  getAvailability: jest.fn(),
  getSchedule: jest.fn(),
  getByTeacher: jest.fn(),
  getBySubject: jest.fn(),
  getReport: jest.fn(),
}));

const roomsService = require('../../services/rooms.service');
const roomSlotsService = require('../../services/room-slots.service');
const roomInsightsService = require('../../services/room-insights.service');

const roomsController = require('../rooms.controller');
const roomSlotsController = require('../room-slots.controller');
const roomInsightsController = require('../room-insights.controller');

const createResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const teacherReq = (overrides = {}) => ({
  user: { id: 4, userType: 'teacher', center_id: 10 }, // JWT: this teacher belongs to center 10
  query: {},
  body: {},
  params: {},
  headers: {},
  ...overrides,
});

const nonOwnerSuperuserReq = (overrides = {}) => ({
  user: { id: 9, userType: 'superuser', role: 'admin', center_id: 10 }, // center admin: NOT global
  query: {},
  body: {},
  params: {},
  headers: {},
  ...overrides,
});

const ownerReq = (overrides = {}) => ({
  user: { id: 1, userType: 'superuser', role: 'owner' }, // global user
  query: {},
  body: {},
  params: {},
  headers: {},
  ...overrides,
});

describe('rooms/room-slots/room-insights controllers — cross-tenant IDOR fix (RMC-036, Critical Finding #2)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('1. a non-global caller cannot override their center via a spoofed center_id', () => {
    it('room list: a teacher spoofing center_id in the query string still gets their own center', async () => {
      const req = teacherReq({ query: { center_id: '999' } });
      const res = createResponse();
      roomsService.getAllRooms.mockResolvedValue([]);

      await roomsController.getAllRooms(req, res);

      expect(roomsService.getAllRooms).toHaveBeenCalledWith(10); // own center, not 999
    });

    it('room create: a teacher spoofing center_id in the request body still gets their own center attached', async () => {
      const req = teacherReq({ body: { center_id: 999, room_number: 'A1', day: 'Monday', time: '09:00' } });
      const res = createResponse();
      roomsService.createRoom.mockResolvedValue({ room_id: 1, center_id: 10 });

      await roomsController.createRoom(req, res);

      expect(roomsService.createRoom).toHaveBeenCalledWith(expect.objectContaining({ center_id: 10 }));
      expect(roomsService.createRoom).not.toHaveBeenCalledWith(expect.objectContaining({ center_id: 999 }));
    });

    it('a non-owner superuser (center admin) spoofing center_id in the query is also confined to their own center', async () => {
      const req = nonOwnerSuperuserReq({ query: { center_id: '999' } });
      const res = createResponse();
      roomsService.getAllRooms.mockResolvedValue([]);

      await roomsController.getAllRooms(req, res);

      expect(roomsService.getAllRooms).toHaveBeenCalledWith(10);
    });

    it('room-slots endpoint: a teacher spoofing center_id in the body when creating a slot still gets their own center', async () => {
      const req = teacherReq({ body: { center_id: 999, room_id: 5, slot_date: '2026-09-10', start_time: '09:00', end_time: '09:30' } });
      const res = createResponse();
      roomSlotsService.addSlot.mockResolvedValue({ slot_id: 1 });

      await roomSlotsController.createSlot(req, res);

      expect(roomSlotsService.addSlot).toHaveBeenCalledWith(expect.objectContaining({ center_id: 10 }));
    });

    it('room-slots endpoint: a teacher spoofing center_id cannot read another center\'s slot list', async () => {
      const req = teacherReq({ query: { center_id: '999' } });
      const res = createResponse();
      roomSlotsService.getSlotsByCenter.mockResolvedValue([]);

      await roomSlotsController.getSlotsByCenter(req, res);

      expect(roomSlotsService.getSlotsByCenter).toHaveBeenCalledWith(10, undefined, undefined);
    });
  });

  describe('2. a global user (owner) can still override center_id — this must not regress', () => {
    it('room list: an owner supplying center_id in the query gets that center, not a default', async () => {
      const req = ownerReq({ query: { center_id: '42' } });
      const res = createResponse();
      roomsService.getAllRooms.mockResolvedValue([]);

      await roomsController.getAllRooms(req, res);

      expect(roomsService.getAllRooms).toHaveBeenCalledWith(42);
    });

    it('room create: an owner supplying center_id in the body gets that center attached', async () => {
      const req = ownerReq({ body: { center_id: 42, room_number: 'B2', day: 'Tuesday', time: '10:00' } });
      const res = createResponse();
      roomsService.createRoom.mockResolvedValue({ room_id: 2, center_id: 42 });

      await roomsController.createRoom(req, res);

      expect(roomsService.createRoom).toHaveBeenCalledWith(expect.objectContaining({ center_id: 42 }));
    });

    it('room-slots endpoint: an owner supplying center_id in the body gets that center attached', async () => {
      const req = ownerReq({ body: { center_id: 42, room_id: 5, slot_date: '2026-09-10', start_time: '09:00', end_time: '09:30' } });
      const res = createResponse();
      roomSlotsService.addSlot.mockResolvedValue({ slot_id: 9 });

      await roomSlotsController.createSlot(req, res);

      expect(roomSlotsService.addSlot).toHaveBeenCalledWith(expect.objectContaining({ center_id: 42 }));
    });

    it('an owner with no center_id supplied at all gets the "center_id is required" 400, not a silent default', async () => {
      const req = ownerReq({ query: {} });
      const res = createResponse();

      await roomsController.getAllRooms(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(roomsService.getAllRooms).not.toHaveBeenCalled();
    });
  });

  describe('3. GET /room-slots/bookings/slot/:slotId is center-scoped end-to-end', () => {
    it('threads the caller\'s own (not spoofed) center id through to roomSlotsService.getBookingsBySlot', async () => {
      const req = teacherReq({ params: { slotId: '77' }, query: { center_id: '999' } });
      const res = createResponse();
      roomSlotsService.getBookingsBySlot.mockResolvedValue([]);

      await roomSlotsController.getBookingsBySlot(req, res);

      expect(roomSlotsService.getBookingsBySlot).toHaveBeenCalledWith('77', 10);
    });

    it('an owner may still explicitly scope the same slot lookup to a chosen center', async () => {
      const req = ownerReq({ params: { slotId: '77' }, query: { center_id: '42' } });
      const res = createResponse();
      roomSlotsService.getBookingsBySlot.mockResolvedValue([{ booking_id: 1, center_id: 42 }]);

      await roomSlotsController.getBookingsBySlot(req, res);

      expect(roomSlotsService.getBookingsBySlot).toHaveBeenCalledWith('77', 42);
    });
  });

  describe('room-insights controller uses the same resolveCenter guard', () => {
    it('a teacher spoofing center_id cannot read another center\'s room overview', async () => {
      const req = teacherReq({ query: { center_id: '999' } });
      const res = createResponse();
      roomInsightsService.getOverview.mockResolvedValue({ rooms: [] });

      await roomInsightsController.overview(req, res);

      expect(roomInsightsService.getOverview).toHaveBeenCalledWith(10, req.query);
    });

    it('an owner can still override center_id for the overview endpoint', async () => {
      const req = ownerReq({ query: { center_id: '42' } });
      const res = createResponse();
      roomInsightsService.getOverview.mockResolvedValue({ rooms: [] });

      await roomInsightsController.overview(req, res);

      expect(roomInsightsService.getOverview).toHaveBeenCalledWith(42, req.query);
    });
  });
});
