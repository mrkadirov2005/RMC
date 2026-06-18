const roomSlotsRepository = require('../repositories/room-slots.repository');

// ROOM SLOTS SERVICES
const getSlotsByRoom = async (roomId: number, centerId: number, fromDate?: string, toDate?: string) => {
  return roomSlotsRepository.findSlotsByRoom(roomId, centerId, fromDate, toDate);
};

const getSlotsByCenter = async (centerId: number, fromDate?: string, toDate?: string) => {
  return roomSlotsRepository.findSlotsByCenter(centerId, fromDate, toDate);
};

const getSlotById = async (slotId: number, centerId: number) => {
  return roomSlotsRepository.findSlotById(slotId, centerId);
};

const getAvailableSlots = async (roomId: number, centerId: number, slotDate: string) => {
  return roomSlotsRepository.findAvailableSlots(roomId, centerId, slotDate);
};

const addSlot = async (data: any) => {
  const { center_id, room_id, slot_date, start_time, end_time, duration_minutes } = data;
  return roomSlotsRepository.createSlot([
    center_id,
    room_id,
    slot_date,
    start_time,
    end_time,
    duration_minutes || 30
  ]);
};

const addMultipleSlots = async (slots: any[]) => {
  return roomSlotsRepository.createMultipleSlots(slots);
};

const modifySlot = async (slotId: number, data: any, centerId: number) => {
  const { start_time, end_time, duration_minutes, is_available } = data;
  return roomSlotsRepository.updateSlot(slotId, [start_time, end_time, duration_minutes || 30, is_available ?? true], centerId);
};

const removeSlot = async (slotId: number, centerId: number) => {
  return roomSlotsRepository.deleteSlot(slotId, centerId);
};

const generateSlots = async (roomId: number, centerId: number, startDate: string, endDate: string, slotConfigs: any[]): Promise<any[]> => {
  /**
   * slotConfigs format:
   * [
   *   { day: 'Monday', slots: ['09:00', '09:30', '10:00', ...] },
   *   { day: 'Tuesday', slots: ['09:00', '09:30', ...] }
   * ]
   */
  const slots: any[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  const dayMap: { [key: string]: number } = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6
  };
  
  while (current <= end) {
    const dayName = Object.keys(dayMap).find(key => dayMap[key] === current.getDay());
    const config = slotConfigs.find(sc => sc.day === dayName);
    
    if (config) {
      const dateStr = current.toISOString().split('T')[0];
      
      for (let i = 0; i < config.slots.length; i++) {
        const startTime = config.slots[i];
        const [hours, minutes] = startTime.split(':').map(Number);
        const endHours = hours + Math.floor((minutes + 30) / 60);
        const endMinutes = (minutes + 30) % 60;
        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        
        slots.push({
          center_id: centerId,
          room_id: roomId,
          slot_date: dateStr,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: 30
        });
      }
    }
    
    current.setDate(current.getDate() + 1);
  }
  
  return roomSlotsRepository.createMultipleSlots(slots as any[]);
};

// ROOM BOOKINGS SERVICES
const getBookingsBySlot = async (slotId: number) => {
  return roomSlotsRepository.findBookingsBySlot(slotId);
};

const getBookingsByClass = async (classId: number, centerId: number) => {
  return roomSlotsRepository.findBookingsByClass(classId, centerId);
};

const getBookingsByRoom = async (roomId: number, centerId: number, fromDate?: string, toDate?: string) => {
  return roomSlotsRepository.findBookingsByRoom(roomId, centerId, fromDate, toDate);
};

const getBookingById = async (bookingId: number, centerId: number) => {
  return roomSlotsRepository.findBookingById(bookingId, centerId);
};

const bookSlot = async (data: any) => {
  const { center_id, slot_id, class_id, session_id, teacher_id, notes } = data;
  
  // Create booking
  const booking = await roomSlotsRepository.createBooking([
    center_id,
    slot_id,
    class_id,
    session_id || null,
    teacher_id || null,
    'Confirmed',
    notes || null
  ]);
  
  // Mark slot as booked
  await roomSlotsRepository.markSlotAsBooked(slot_id, center_id);
  
  return booking;
};

const modifyBooking = async (bookingId: number, data: any, centerId: number) => {
  const { booking_status, notes } = data;
  return roomSlotsRepository.updateBooking(bookingId, [booking_status, notes || null], centerId);
};

const cancelBooking = async (bookingId: number, centerId: number) => {
  // Get booking first
  const booking = await roomSlotsRepository.findBookingById(bookingId, centerId);
  if (!booking) {
    throw new Error('Booking not found');
  }
  
  // Delete booking
  await roomSlotsRepository.deleteBooking(bookingId, centerId);
  
  // Mark slot as available again
  await roomSlotsRepository.markSlotAsAvailable(booking.slot_id, centerId);
  
  return booking;
};

module.exports = {
  // Slots
  getSlotsByRoom,
  getSlotsByCenter,
  getSlotById,
  getAvailableSlots,
  addSlot,
  addMultipleSlots,
  modifySlot,
  removeSlot,
  generateSlots,
  // Bookings
  getBookingsBySlot,
  getBookingsByClass,
  getBookingsByRoom,
  getBookingById,
  bookSlot,
  modifyBooking,
  cancelBooking,
};

export {};
