const pool = require('../../../db/pool');

// ROOM SLOTS QUERIES
const findSlotsByRoom = (roomId: number, centerId: number, fromDate?: string, toDate?: string) => {
  let query = `
    SELECT * FROM room_slots 
    WHERE room_id = $1 AND center_id = $2
  `;
  const params: any[] = [roomId, centerId];
  
  if (fromDate && toDate) {
    query += ` AND slot_date BETWEEN $3 AND $4`;
    params.push(fromDate, toDate);
  }
  
  query += ` ORDER BY slot_date, start_time`;
  
  return pool.query(query, params).then((r: any) => r.rows);
};

const findSlotsByCenter = (centerId: number, fromDate?: string, toDate?: string) => {
  let query = `
    SELECT rs.*, r.room_number, r.class_id
    FROM room_slots rs
    JOIN rooms r ON rs.room_id = r.room_id
    WHERE rs.center_id = $1
  `;
  const params: any[] = [centerId];
  
  if (fromDate && toDate) {
    query += ` AND rs.slot_date BETWEEN $2 AND $3`;
    params.push(fromDate, toDate);
  }
  
  query += ` ORDER BY rs.slot_date, rs.start_time`;
  
  return pool.query(query, params).then((r: any) => r.rows);
};

const findSlotById = (slotId: number, centerId: number) => {
  return pool
    .query('SELECT * FROM room_slots WHERE slot_id = $1 AND center_id = $2', [slotId, centerId])
    .then((r: any) => r.rows[0] || null);
};

const findAvailableSlots = (roomId: number, centerId: number, slotDate: string) => {
  return pool
    .query(
      `SELECT * FROM room_slots 
       WHERE room_id = $1 AND center_id = $2 AND slot_date = $3 AND is_available = TRUE
       ORDER BY start_time`,
      [roomId, centerId, slotDate]
    )
    .then((r: any) => r.rows);
};

const createSlot = (params: any[]) => {
  return pool
    .query(
      `INSERT INTO room_slots (center_id, room_id, slot_date, start_time, end_time, duration_minutes, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);
};

const createMultipleSlots = async (slots: any[]): Promise<any[]> => {
  const results: any[] = [];
  for (const slot of slots) {
    const result = await createSlot([
      slot.center_id,
      slot.room_id,
      slot.slot_date,
      slot.start_time,
      slot.end_time,
      slot.duration_minutes || 30
    ] as any[]);
    results.push(result);
  }
  return results;
};

const updateSlot = (slotId: number, params: any[], centerId: number) => {
  return pool
    .query(
      `UPDATE room_slots 
       SET start_time = $1, end_time = $2, duration_minutes = $3, is_available = $4, updated_at = CURRENT_TIMESTAMP
       WHERE slot_id = $5 AND center_id = $6
       RETURNING *`,
      [...params, slotId, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

const deleteSlot = (slotId: number, centerId: number) => {
  return pool
    .query('DELETE FROM room_slots WHERE slot_id = $1 AND center_id = $2 RETURNING *', [slotId, centerId])
    .then((r: any) => r.rows[0] || null);
};

// ROOM BOOKINGS QUERIES
const findBookingsBySlot = (slotId: number) => {
  return pool
    .query(
      `SELECT rb.*, rs.slot_date, rs.start_time, rs.end_time, r.room_number, c.class_name
       FROM room_bookings rb
       JOIN room_slots rs ON rb.slot_id = rs.slot_id
       JOIN rooms r ON rs.room_id = r.room_id
       JOIN classes c ON rb.class_id = c.class_id
       WHERE rb.slot_id = $1`,
      [slotId]
    )
    .then((r: any) => r.rows);
};

const findBookingsByClass = (classId: number, centerId: number) => {
  return pool
    .query(
      `SELECT rb.*, rs.slot_date, rs.start_time, rs.end_time, r.room_number
       FROM room_bookings rb
       JOIN room_slots rs ON rb.slot_id = rs.slot_id
       JOIN rooms r ON rs.room_id = r.room_id
       WHERE rb.class_id = $1 AND rb.center_id = $2
       ORDER BY rs.slot_date, rs.start_time`,
      [classId, centerId]
    )
    .then((r: any) => r.rows);
};

const findBookingsByRoom = (roomId: number, centerId: number, fromDate?: string, toDate?: string) => {
  let query = `
    SELECT rb.*, rs.slot_date, rs.start_time, rs.end_time, c.class_name
    FROM room_bookings rb
    JOIN room_slots rs ON rb.slot_id = rs.slot_id
    JOIN rooms r ON rs.room_id = r.room_id
    JOIN classes c ON rb.class_id = c.class_id
    WHERE r.room_id = $1 AND rb.center_id = $2
  `;
  const params: any[] = [roomId, centerId];
  
  if (fromDate && toDate) {
    query += ` AND rs.slot_date BETWEEN $3 AND $4`;
    params.push(fromDate, toDate);
  }
  
  query += ` ORDER BY rs.slot_date, rs.start_time`;
  
  return pool.query(query, params).then((r: any) => r.rows);
};

const findBookingById = (bookingId: number, centerId: number) => {
  return pool
    .query(
      `SELECT * FROM room_bookings WHERE booking_id = $1 AND center_id = $2`,
      [bookingId, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

const createBooking = (params: any[]) => {
  return pool
    .query(
      `INSERT INTO room_bookings (center_id, slot_id, class_id, session_id, teacher_id, booking_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);
};

const updateBooking = (bookingId: number, params: any[], centerId: number) => {
  return pool
    .query(
      `UPDATE room_bookings 
       SET booking_status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $3 AND center_id = $4
       RETURNING *`,
      [...params, bookingId, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

const deleteBooking = (bookingId: number, centerId: number) => {
  return pool
    .query('DELETE FROM room_bookings WHERE booking_id = $1 AND center_id = $2 RETURNING *', [bookingId, centerId])
    .then((r: any) => r.rows[0] || null);
};

const markSlotAsBooked = (slotId: number, centerId: number) => {
  return pool
    .query(
      `UPDATE room_slots SET is_available = FALSE, updated_at = CURRENT_TIMESTAMP 
       WHERE slot_id = $1 AND center_id = $2
       RETURNING *`,
      [slotId, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

const markSlotAsAvailable = (slotId: number, centerId: number) => {
  return pool
    .query(
      `UPDATE room_slots SET is_available = TRUE, updated_at = CURRENT_TIMESTAMP 
       WHERE slot_id = $1 AND center_id = $2
       RETURNING *`,
      [slotId, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

module.exports = {
  // Slots
  findSlotsByRoom,
  findSlotsByCenter,
  findSlotById,
  findAvailableSlots,
  createSlot,
  createMultipleSlots,
  updateSlot,
  deleteSlot,
  markSlotAsBooked,
  markSlotAsAvailable,
  // Bookings
  findBookingsBySlot,
  findBookingsByClass,
  findBookingsByRoom,
  findBookingById,
  createBooking,
  updateBooking,
  deleteBooking,
};

export {};
