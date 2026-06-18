const express = require('express');
const router = express.Router();
const roomSlotsController = require('../modules/rooms/controllers/room-slots.controller');
const { requireAuth } = require('../middleware/auth');

// ROOM SLOTS ROUTES
router.get('/slots/center', requireAuth, roomSlotsController.getSlotsByCenter);
router.get('/slots/room/:roomId', requireAuth, roomSlotsController.getSlotsByRoom);
router.get('/slots/room/:roomId/available', requireAuth, roomSlotsController.getAvailableSlots);
router.post('/slots', requireAuth, roomSlotsController.createSlot);
router.post('/slots/batch', requireAuth, roomSlotsController.createMultipleSlots);
router.post('/slots/generate', requireAuth, roomSlotsController.generateSlotsForDateRange);
router.put('/slots/:slotId', requireAuth, roomSlotsController.updateSlot);
router.delete('/slots/:slotId', requireAuth, roomSlotsController.deleteSlot);

// ROOM BOOKINGS ROUTES
router.get('/bookings/slot/:slotId', requireAuth, roomSlotsController.getBookingsBySlot);
router.get('/bookings/class/:classId', requireAuth, roomSlotsController.getBookingsByClass);
router.get('/bookings/room/:roomId', requireAuth, roomSlotsController.getBookingsByRoom);
router.post('/bookings', requireAuth, roomSlotsController.createBooking);
router.put('/bookings/:bookingId', requireAuth, roomSlotsController.updateBooking);
router.delete('/bookings/:bookingId', requireAuth, roomSlotsController.cancelBooking);

module.exports = router;

export {};
