describe('room booking conflicts and concurrency with PostgreSQL', () => {
  let pool;
  let service;
  let centerId;
  let otherCenterId;
  let roomId;
  let classId;
  let otherClassId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Room Center', 'ROOM-A') RETURNING center_id`)).rows[0].center_id;
    otherCenterId = (await pool.query(`INSERT INTO edu_centers (center_name, center_code) VALUES ('Other Room Center', 'ROOM-B') RETURNING center_id`)).rows[0].center_id;
    classId = (await pool.query(`INSERT INTO classes (center_id, class_name, class_code) VALUES ($1, 'Room Class', 'ROOM-C1') RETURNING class_id`, [centerId])).rows[0].class_id;
    otherClassId = (await pool.query(`INSERT INTO classes (center_id, class_name, class_code) VALUES ($1, 'Other Class', 'ROOM-C2') RETURNING class_id`, [otherCenterId])).rows[0].class_id;
    roomId = (await pool.query(
      `INSERT INTO rooms (center_id, room_number, day, time, end_time) VALUES ($1, '101', 'Monday', '09:00', '10:00') RETURNING room_id`, [centerId]
    )).rows[0].room_id;
    service = require('../../../src/modules/rooms/services/room-slots.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  const createSlot = (date, start = '09:00', end = '09:30') => service.addSlot({
    center_id: centerId, room_id: roomId, slot_date: date, start_time: start, end_time: end, duration_minutes: 30,
  });

  test('slot creation is center scoped and appears in availability', async () => {
    const slot = await createSlot('2026-08-10');
    const available = await service.getAvailableSlots(roomId, centerId, '2026-08-10');
    expect(available).toHaveLength(1); expect(available[0]).toMatchObject({ slot_id: slot.slot_id, center_id: centerId, is_available: true });
    await expect(service.getAvailableSlots(roomId, otherCenterId, '2026-08-10')).resolves.toEqual([]);
  });

  test('two concurrent bookings yield exactly one winner and one conflict', async () => {
    const slot = (await service.getAvailableSlots(roomId, centerId, '2026-08-10'))[0];
    const body = { center_id: centerId, slot_id: slot.slot_id, class_id: classId };
    const outcomes = await Promise.allSettled([service.bookSlot(body), service.bookSlot(body)]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejection = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejection.reason).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    expect(Number((await pool.query('SELECT COUNT(*) count FROM room_bookings WHERE slot_id=$1', [slot.slot_id])).rows[0].count)).toBe(1);
    expect((await pool.query('SELECT is_available FROM room_slots WHERE slot_id=$1', [slot.slot_id])).rows[0].is_available).toBe(false);
  });

  test('cancelling a booking atomically restores slot availability', async () => {
    const booking = (await pool.query(`SELECT booking_id, slot_id FROM room_bookings LIMIT 1`)).rows[0];
    await expect(service.cancelBooking(booking.booking_id, centerId)).resolves.toMatchObject({ booking_id: booking.booking_id });
    expect(Number((await pool.query('SELECT COUNT(*) count FROM room_bookings WHERE booking_id=$1', [booking.booking_id])).rows[0].count)).toBe(0);
    expect((await pool.query('SELECT is_available FROM room_slots WHERE slot_id=$1', [booking.slot_id])).rows[0].is_available).toBe(true);
  });

  test('cross-center class booking rolls back and leaves slot available', async () => {
    const slot = await createSlot('2026-08-11');
    await expect(service.bookSlot({ center_id: centerId, slot_id: slot.slot_id, class_id: otherClassId })).rejects.toMatchObject({ code: 'CLASS_NOT_FOUND' });
    expect((await pool.query('SELECT is_available FROM room_slots WHERE slot_id=$1', [slot.slot_id])).rows[0].is_available).toBe(true);
    expect(Number((await pool.query('SELECT COUNT(*) count FROM room_bookings WHERE slot_id=$1', [slot.slot_id])).rows[0].count)).toBe(0);
  });
});
