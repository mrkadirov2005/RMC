const roomSlotsService = require('../services/room-slots.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const resolveCenter = (req: any, res: any): number | null => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Center scope required.' });
    return null;
  }
  if (!centerId && isGlobal) {
    res.status(400).json({ error: 'center_id is required for superuser actions.' });
    return null;
  }
  return centerId as number;
};

// ROOM SLOTS CONTROLLERS
const getSlotsByRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { from_date, to_date } = req.query;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const slots = await roomSlotsService.getSlotsByRoom(roomId, centerId, from_date, to_date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getSlotsByCenter = async (req: any, res: any) => {
  try {
    const { from_date, to_date } = req.query;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const slots = await roomSlotsService.getSlotsByCenter(centerId, from_date, to_date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getAvailableSlots = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { slot_date } = req.query;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    if (!slot_date) return res.status(400).json({ error: 'Slot date is required' });

    const slots = await roomSlotsService.getAvailableSlots(roomId, centerId, slot_date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createSlot = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { room_id, slot_date, start_time, end_time, duration_minutes } = req.body;

    const slot = await roomSlotsService.addSlot({
      center_id: centerId,
      room_id,
      slot_date,
      start_time,
      end_time,
      duration_minutes: duration_minutes || 30
    });

    res.status(201).json(slot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createMultipleSlots = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { slots } = req.body;

    // Add center_id to each slot
    const slotsWithCenter = slots.map((s: any) => ({ ...s, center_id: centerId }));
    const createdSlots = await roomSlotsService.addMultipleSlots(slotsWithCenter);

    res.status(201).json(createdSlots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const generateSlotsForDateRange = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { room_id, start_date, end_date, slot_configs } = req.body;

    const slots = await roomSlotsService.generateSlots(room_id, centerId, start_date, end_date, slot_configs);
    res.status(201).json({ message: `Generated ${slots.length} slots`, slots });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateSlot = async (req: any, res: any) => {
  try {
    const { slotId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { start_time, end_time, duration_minutes, is_available } = req.body;

    const slot = await roomSlotsService.modifySlot(slotId, {
      start_time,
      end_time,
      duration_minutes,
      is_available
    }, centerId);

    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    res.json(slot);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteSlot = async (req: any, res: any) => {
  try {
    const { slotId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const slot = await roomSlotsService.removeSlot(slotId, centerId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    res.json({ message: 'Slot deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// ROOM BOOKINGS CONTROLLERS
const getBookingsBySlot = async (req: any, res: any) => {
  try {
    const { slotId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const bookings = await roomSlotsService.getBookingsBySlot(slotId, centerId);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getBookingsByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const bookings = await roomSlotsService.getBookingsByClass(classId, centerId);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getBookingsByRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { from_date, to_date } = req.query;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    const bookings = await roomSlotsService.getBookingsByRoom(roomId, centerId, from_date, to_date);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createBooking = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { slot_id, class_id, session_id, teacher_id, notes } = req.body;

    const booking = await roomSlotsService.bookSlot({
      center_id: centerId,
      slot_id,
      class_id,
      session_id,
      teacher_id,
      notes
    });

    res.status(201).json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateBooking = async (req: any, res: any) => {
  try {
    const { bookingId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const { booking_status, notes } = req.body;

    const booking = await roomSlotsService.modifyBooking(bookingId, {
      booking_status,
      notes
    }, centerId);

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const cancelBooking = async (req: any, res: any) => {
  try {
    const { bookingId } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;

    await roomSlotsService.cancelBooking(bookingId, centerId);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  // Slots
  getSlotsByRoom,
  getSlotsByCenter,
  getAvailableSlots,
  createSlot,
  createMultipleSlots,
  generateSlotsForDateRange,
  updateSlot,
  deleteSlot,
  // Bookings
  getBookingsBySlot,
  getBookingsByClass,
  getBookingsByRoom,
  createBooking,
  updateBooking,
  cancelBooking,
};

export {};
