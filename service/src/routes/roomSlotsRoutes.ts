const express = require('express');
const router = express.Router();
const roomSlotsController = require('../modules/rooms/controllers/room-slots.controller');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validation');
const {
  BookingIdParamDto,
  ClassIdParamDto,
  CreateMultipleRoomSlotsDto,
  CreateRoomBookingDto,
  CreateRoomSlotDto,
  GenerateRoomSlotsDto,
  RoomIdParamDto,
  SlotIdParamDto,
  UpdateRoomBookingDto,
  UpdateRoomSlotDto,
} = require('../dtos/request.dto');

// ROOM SLOTS ROUTES
router.get('/slots/center', requireAuth, roomSlotsController.getSlotsByCenter);
router.get('/slots/room/:roomId', requireAuth, validateParams(RoomIdParamDto), roomSlotsController.getSlotsByRoom);
router.get('/slots/room/:roomId/available', requireAuth, validateParams(RoomIdParamDto), roomSlotsController.getAvailableSlots);
router.post('/slots', requireAuth, validateBody(CreateRoomSlotDto), roomSlotsController.createSlot);
router.post('/slots/batch', requireAuth, validateBody(CreateMultipleRoomSlotsDto), roomSlotsController.createMultipleSlots);
router.post('/slots/generate', requireAuth, validateBody(GenerateRoomSlotsDto), roomSlotsController.generateSlotsForDateRange);
router.put('/slots/:slotId', requireAuth, validateParams(SlotIdParamDto), validateBody(UpdateRoomSlotDto), roomSlotsController.updateSlot);
router.delete('/slots/:slotId', requireAuth, validateParams(SlotIdParamDto), roomSlotsController.deleteSlot);

// ROOM BOOKINGS ROUTES
router.get('/bookings/slot/:slotId', requireAuth, validateParams(SlotIdParamDto), roomSlotsController.getBookingsBySlot);
router.get('/bookings/class/:classId', requireAuth, validateParams(ClassIdParamDto), roomSlotsController.getBookingsByClass);
router.get('/bookings/room/:roomId', requireAuth, validateParams(RoomIdParamDto), roomSlotsController.getBookingsByRoom);
router.post('/bookings', requireAuth, validateBody(CreateRoomBookingDto), roomSlotsController.createBooking);
router.put('/bookings/:bookingId', requireAuth, validateParams(BookingIdParamDto), validateBody(UpdateRoomBookingDto), roomSlotsController.updateBooking);
router.delete('/bookings/:bookingId', requireAuth, validateParams(BookingIdParamDto), roomSlotsController.cancelBooking);

module.exports = router;

export {};
