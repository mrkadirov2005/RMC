const roomSlotsService = require('../services/room-slots.service');

// ROOM SLOTS CONTROLLERS
const getSlotsByRoom = async (req: any, res: any) => {
  try {
    const { roomId } = req.params;
    const { from_date, to_date } = req.query;
    const centerId = req.query.center_id || req.user.center_id;
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    
    const slots = await roomSlotsService.getSlotsByRoom(roomId, centerId, from_date, to_date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getSlotsByCenter = async (req: any, res: any) => {
  try {
    const { from_date, to_date } = req.query;
    const centerId = req.query.center_id || req.user.center_id;
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    
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
    const centerId = req.query.center_id || req.user.center_id;
    
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    if (!slot_date) return res.status(400).json({ error: 'Slot date is required' });
    
    const slots = await roomSlotsService.getAvailableSlots(roomId, centerId, slot_date);
    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createSlot = async (req: any, res: any) => {
  try {
    const centerId = req.body.center_id || req.user.center_id;
    const { room_id, slot_date, start_time, end_time, duration_minutes } = req.body;
    
    if (!room_id || !slot_date || !start_time || !end_time) {
      return res.status(400).json({ error: 'Missing required fields: room_id, slot_date, start_time, end_time' });
    }
    
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
    const centerId = req.body.center_id || req.user.center_id;
    const { slots } = req.body;
    
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ error: 'Slots array is required and must not be empty' });
    }
    
    // Add center_id to each slot
    const slotsWithCenter = slots.map(s => ({ ...s, center_id: centerId }));
    const createdSlots = await roomSlotsService.addMultipleSlots(slotsWithCenter);
    
    res.status(201).json(createdSlots);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const generateSlotsForDateRange = async (req: any, res: any) => {
  try {
    const centerId = req.body.center_id || req.user.center_id;
    const { room_id, start_date, end_date, slot_configs } = req.body;
    
    if (!room_id || !start_date || !end_date || !Array.isArray(slot_configs)) {
      return res.status(400).json({ error: 'Missing required fields: room_id, start_date, end_date, slot_configs' });
    }
    
    const slots = await roomSlotsService.generateSlots(room_id, centerId, start_date, end_date, slot_configs);
    res.status(201).json({ message: `Generated ${slots.length} slots`, slots });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateSlot = async (req: any, res: any) => {
  try {
    const { slotId } = req.params;
    const centerId = req.body.center_id || req.user.center_id;
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
    const centerId = req.query.center_id || req.user.center_id;
    
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
    
    const bookings = await roomSlotsService.getBookingsBySlot(slotId);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getBookingsByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const centerId = req.query.center_id || req.user.center_id;
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    
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
    const centerId = req.query.center_id || req.user.center_id;
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    
    const bookings = await roomSlotsService.getBookingsByRoom(roomId, centerId, from_date, to_date);
    res.json(bookings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createBooking = async (req: any, res: any) => {
  try {
    const centerId = req.body.center_id || req.user.center_id;
    const { slot_id, class_id, session_id, teacher_id, notes } = req.body;
    
    if (!slot_id || !class_id) {
      return res.status(400).json({ error: 'Missing required fields: slot_id, class_id' });
    }
    
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
    const centerId = req.body.center_id || req.user.center_id;
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
    const centerId = req.query.center_id || req.user.center_id;
    
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
