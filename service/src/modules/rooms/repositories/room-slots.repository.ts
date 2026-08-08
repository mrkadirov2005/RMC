const { and, asc, eq, gte, lte, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { classes, roomBookings, rooms, roomSlots } = require('../../../db/schema');

const db = pool.db;

const slotSelection = {
  slot_id: roomSlots.slotId,
  center_id: roomSlots.centerId,
  room_id: roomSlots.roomId,
  slot_date: roomSlots.slotDate,
  start_time: roomSlots.startTime,
  end_time: roomSlots.endTime,
  duration_minutes: roomSlots.durationMinutes,
  is_available: roomSlots.isAvailable,
  created_at: roomSlots.createdAt,
  updated_at: roomSlots.updatedAt,
};

const bookingSelection = {
  booking_id: roomBookings.bookingId,
  center_id: roomBookings.centerId,
  slot_id: roomBookings.slotId,
  class_id: roomBookings.classId,
  session_id: roomBookings.sessionId,
  teacher_id: roomBookings.teacherId,
  booking_date: roomBookings.bookingDate,
  booking_status: roomBookings.bookingStatus,
  notes: roomBookings.notes,
  created_at: roomBookings.createdAt,
  updated_at: roomBookings.updatedAt,
};

const slotDateRange = (fromDate?: string, toDate?: string) =>
  fromDate && toDate ? [gte(roomSlots.slotDate, fromDate), lte(roomSlots.slotDate, toDate)] : [];

// ROOM SLOTS QUERIES
const findSlotsByRoom = (roomId: number, centerId: number, fromDate?: string, toDate?: string) =>
  db
    .select(slotSelection)
    .from(roomSlots)
    .where(and(eq(roomSlots.roomId, roomId), eq(roomSlots.centerId, centerId), ...slotDateRange(fromDate, toDate)))
    .orderBy(asc(roomSlots.slotDate), asc(roomSlots.startTime));

const findSlotsByCenter = (centerId: number, fromDate?: string, toDate?: string) =>
  db
    .select({
      ...slotSelection,
      room_number: rooms.roomNumber,
      class_id: rooms.classId,
    })
    .from(roomSlots)
    .innerJoin(rooms, eq(roomSlots.roomId, rooms.roomId))
    .where(and(eq(roomSlots.centerId, centerId), ...slotDateRange(fromDate, toDate)))
    .orderBy(asc(roomSlots.slotDate), asc(roomSlots.startTime));

const findSlotById = (slotId: number, centerId: number) =>
  db
    .select(slotSelection)
    .from(roomSlots)
    .where(and(eq(roomSlots.slotId, slotId), eq(roomSlots.centerId, centerId)))
    .then((rows: any[]) => rows[0] || null);

const findAvailableSlots = (roomId: number, centerId: number, slotDate: string) =>
  db
    .select(slotSelection)
    .from(roomSlots)
    .where(
      and(
        eq(roomSlots.roomId, roomId),
        eq(roomSlots.centerId, centerId),
        eq(roomSlots.slotDate, slotDate),
        eq(roomSlots.isAvailable, true)
      )
    )
    .orderBy(asc(roomSlots.startTime));

const createSlot = (params: any[]) =>
  db
    .insert(roomSlots)
    .values({
      centerId: params[0],
      roomId: params[1],
      slotDate: params[2],
      startTime: params[3],
      endTime: params[4],
      durationMinutes: params[5],
      isAvailable: true,
    })
    .returning(slotSelection)
    .then((rows: any[]) => rows[0]);

const createMultipleSlots = async (slots: any[]): Promise<any[]> => {
  const results: any[] = [];
  for (const slot of slots) {
    const result = await createSlot([
      slot.center_id,
      slot.room_id,
      slot.slot_date,
      slot.start_time,
      slot.end_time,
      slot.duration_minutes || 30,
    ] as any[]);
    results.push(result);
  }
  return results;
};

const updateSlot = (slotId: number, params: any[], centerId: number) =>
  db
    .update(roomSlots)
    .set({
      startTime: params[0],
      endTime: params[1],
      durationMinutes: params[2],
      isAvailable: params[3],
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(roomSlots.slotId, slotId), eq(roomSlots.centerId, centerId)))
    .returning(slotSelection)
    .then((rows: any[]) => rows[0] || null);

const deleteSlot = (slotId: number, centerId: number) =>
  db
    .delete(roomSlots)
    .where(and(eq(roomSlots.slotId, slotId), eq(roomSlots.centerId, centerId)))
    .returning(slotSelection)
    .then((rows: any[]) => rows[0] || null);

// ROOM BOOKINGS QUERIES
const findBookingsBySlot = (slotId: number) =>
  db
    .select({
      ...bookingSelection,
      slot_date: roomSlots.slotDate,
      start_time: roomSlots.startTime,
      end_time: roomSlots.endTime,
      room_number: rooms.roomNumber,
      class_name: classes.className,
    })
    .from(roomBookings)
    .innerJoin(roomSlots, eq(roomBookings.slotId, roomSlots.slotId))
    .innerJoin(rooms, eq(roomSlots.roomId, rooms.roomId))
    .innerJoin(classes, eq(roomBookings.classId, classes.classId))
    .where(eq(roomBookings.slotId, slotId));

const findBookingsByClass = (classId: number, centerId: number) =>
  db
    .select({
      ...bookingSelection,
      slot_date: roomSlots.slotDate,
      start_time: roomSlots.startTime,
      end_time: roomSlots.endTime,
      room_number: rooms.roomNumber,
    })
    .from(roomBookings)
    .innerJoin(roomSlots, eq(roomBookings.slotId, roomSlots.slotId))
    .innerJoin(rooms, eq(roomSlots.roomId, rooms.roomId))
    .where(and(eq(roomBookings.classId, classId), eq(roomBookings.centerId, centerId)))
    .orderBy(asc(roomSlots.slotDate), asc(roomSlots.startTime));

const findBookingsByRoom = (roomId: number, centerId: number, fromDate?: string, toDate?: string) =>
  db
    .select({
      ...bookingSelection,
      slot_date: roomSlots.slotDate,
      start_time: roomSlots.startTime,
      end_time: roomSlots.endTime,
      class_name: classes.className,
    })
    .from(roomBookings)
    .innerJoin(roomSlots, eq(roomBookings.slotId, roomSlots.slotId))
    .innerJoin(rooms, eq(roomSlots.roomId, rooms.roomId))
    .innerJoin(classes, eq(roomBookings.classId, classes.classId))
    .where(and(eq(rooms.roomId, roomId), eq(roomBookings.centerId, centerId), ...slotDateRange(fromDate, toDate)))
    .orderBy(asc(roomSlots.slotDate), asc(roomSlots.startTime));

const findBookingById = (bookingId: number, centerId: number) =>
  db
    .select(bookingSelection)
    .from(roomBookings)
    .where(and(eq(roomBookings.bookingId, bookingId), eq(roomBookings.centerId, centerId)))
    .then((rows: any[]) => rows[0] || null);

const createBooking = (params: any[]) =>
  db
    .insert(roomBookings)
    .values({
      centerId: params[0],
      slotId: params[1],
      classId: params[2],
      sessionId: params[3],
      teacherId: params[4],
      bookingStatus: params[5],
      notes: params[6],
    })
    .returning(bookingSelection)
    .then((rows: any[]) => rows[0]);

const updateBooking = (bookingId: number, params: any[], centerId: number) =>
  db
    .update(roomBookings)
    .set({
      bookingStatus: params[0],
      notes: params[1],
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(eq(roomBookings.bookingId, bookingId), eq(roomBookings.centerId, centerId)))
    .returning(bookingSelection)
    .then((rows: any[]) => rows[0] || null);

const deleteBooking = (bookingId: number, centerId: number) =>
  db
    .delete(roomBookings)
    .where(and(eq(roomBookings.bookingId, bookingId), eq(roomBookings.centerId, centerId)))
    .returning(bookingSelection)
    .then((rows: any[]) => rows[0] || null);

const markSlotAsBooked = (slotId: number, centerId: number) =>
  db
    .update(roomSlots)
    .set({ isAvailable: false, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(roomSlots.slotId, slotId), eq(roomSlots.centerId, centerId)))
    .returning(slotSelection)
    .then((rows: any[]) => rows[0] || null);

const markSlotAsAvailable = (slotId: number, centerId: number) =>
  db
    .update(roomSlots)
    .set({ isAvailable: true, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(roomSlots.slotId, slotId), eq(roomSlots.centerId, centerId)))
    .returning(slotSelection)
    .then((rows: any[]) => rows[0] || null);

const bookingError = (message: string, code: string) => {
  const error: any = new Error(message);
  error.code = code;
  return error;
};

const bookSlotAtomic = async (params: any[]) => {
  const [centerId, slotId, classId, sessionId, teacherId, bookingStatus, notes] = params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slot = await client.query(
      `SELECT slot_id, center_id, is_available FROM room_slots
       WHERE slot_id = $1 AND center_id = $2 FOR UPDATE`,
      [slotId, centerId]
    );
    if (!slot.rows[0]) throw bookingError('Slot not found', 'SLOT_NOT_FOUND');
    if (!slot.rows[0].is_available) throw bookingError('Slot is not available', 'SLOT_UNAVAILABLE');
    const classRow = await client.query(
      `SELECT class_id FROM classes WHERE class_id = $1 AND center_id = $2 AND deleted_at IS NULL`,
      [classId, centerId]
    );
    if (!classRow.rows[0]) throw bookingError('Class not found', 'CLASS_NOT_FOUND');
    const inserted = await client.query(
      `INSERT INTO room_bookings
       (center_id, slot_id, class_id, session_id, teacher_id, booking_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [centerId, slotId, classId, sessionId, teacherId, bookingStatus, notes]
    );
    await client.query(
      `UPDATE room_slots SET is_available = false, updated_at = CURRENT_TIMESTAMP
       WHERE slot_id = $1 AND center_id = $2`,
      [slotId, centerId]
    );
    await client.query('COMMIT');
    return inserted.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
};

const cancelBookingAtomic = async (bookingId: number, centerId: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const booking = await client.query(
      `SELECT * FROM room_bookings WHERE booking_id = $1 AND center_id = $2 FOR UPDATE`,
      [bookingId, centerId]
    );
    if (!booking.rows[0]) throw bookingError('Booking not found', 'BOOKING_NOT_FOUND');
    await client.query('DELETE FROM room_bookings WHERE booking_id = $1 AND center_id = $2', [bookingId, centerId]);
    await client.query(
      `UPDATE room_slots SET is_available = true, updated_at = CURRENT_TIMESTAMP
       WHERE slot_id = $1 AND center_id = $2`,
      [booking.rows[0].slot_id, centerId]
    );
    await client.query('COMMIT');
    return booking.rows[0];
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
  bookSlotAtomic,
  cancelBookingAtomic,
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
