describe('room insights, availability, and utilization with PostgreSQL', () => {
  let pool;
  let service;
  let centerId;
  let otherCenterId;
  let roomId;
  let physicalRoomId;
  let classId;

  beforeAll(async () => {
    pool = require('../../../src/db/pool');
    await pool.query('TRUNCATE TABLE edu_centers, owners RESTART IDENTITY CASCADE');
    centerId = (await pool.query("INSERT INTO edu_centers (center_name, center_code) VALUES ('Insights Center', 'ROOM-I') RETURNING center_id")).rows[0].center_id;
    otherCenterId = (await pool.query("INSERT INTO edu_centers (center_name, center_code) VALUES ('Hidden Center', 'ROOM-X') RETURNING center_id")).rows[0].center_id;
    const teacherId = (await pool.query(
      "INSERT INTO teachers (center_id, employee_id, first_name, last_name) VALUES ($1, 'ROOM-T', 'Grace', 'Hopper') RETURNING teacher_id",
      [centerId],
    )).rows[0].teacher_id;
    classId = (await pool.query(
      "INSERT INTO classes (center_id, class_name, class_code, teacher_id) VALUES ($1, 'Room Group', 'ROOM-G', $2) RETURNING class_id",
      [centerId, teacherId],
    )).rows[0].class_id;
    physicalRoomId = (await pool.query(
      "INSERT INTO physical_rooms (center_id, name, capacity, operating_start_time, operating_end_time) VALUES ($1, 'Room 101', 20, '08:00', '18:00') RETURNING physical_room_id",
      [centerId],
    )).rows[0].physical_room_id;
    await pool.query("INSERT INTO physical_rooms (center_id, name) VALUES ($1, 'Hidden Room')", [otherCenterId]);
    roomId = (await pool.query(
      "INSERT INTO rooms (center_id, room_number, physical_room_id, class_id, day, time, end_time) VALUES ($1, 'Room 101', $2, $3, 'Monday', '09:00', '10:00') RETURNING room_id",
      [centerId, physicalRoomId, classId],
    )).rows[0].room_id;
    service = require('../../../src/modules/rooms/services/room-insights.service');
  });

  afterAll(async () => { if (pool) await pool.end(); });

  test('overview and availability remain center scoped and honor full interval overlap', async () => {
    const overview = await service.getOverview(centerId, { date: '2026-08-10', start: '09:30', end: '09:45' });
    expect(overview.summary).toMatchObject({ total_rooms: 1, available_rooms: 0, occupied_rooms: 1, scheduled_lessons: 1 });
    expect(overview.rooms).toEqual([expect.objectContaining({ room_id: physicalRoomId, name: 'Room 101' })]);
    expect(overview.rooms).not.toEqual(expect.arrayContaining([expect.objectContaining({ name: 'Hidden Room' })]));

    await expect(service.getAvailability(centerId, { date: '2026-08-10', start: '10:00', end: '11:00' }))
      .resolves.toEqual([expect.objectContaining({ room_id: physicalRoomId, available: true })]);
  });

  test('dated booking replaces overlapping recurring schedule and is not double-counted', async () => {
    const slotId = (await pool.query(
      "INSERT INTO room_slots (center_id, room_id, slot_date, start_time, end_time, is_available) VALUES ($1, $2, '2026-08-10', '09:00', '09:30', false) RETURNING slot_id",
      [centerId, roomId],
    )).rows[0].slot_id;
    await pool.query(
      "INSERT INTO room_bookings (center_id, slot_id, class_id, booking_status) VALUES ($1, $2, $3, 'Confirmed')",
      [centerId, slotId, classId],
    );

    const schedule = await service.getSchedule(centerId, { date: '2026-08-10' });
    expect(schedule).toHaveLength(1);
    expect(schedule[0]).toMatchObject({ physical_room_id: physicalRoomId, source: 'booking', class_id: classId });

    const [report] = await service.getReport(centerId, { from: '2026-08-10', to: '2026-08-10' });
    expect(report).toMatchObject({ room_id: physicalRoomId, booked_minutes: 30, available_minutes: 600 });
    expect(Number(report.utilization_percent)).toBe(5);
  });

  test('teacher breakdown carries teacher details and excludes another center', async () => {
    const groups = await service.getByTeacher(centerId, { date: '2026-08-10' });
    expect(groups).toEqual([
      expect.objectContaining({ teacher_name: 'Grace Hopper', bookings: [expect.objectContaining({ room_name: 'Room 101' })] }),
    ]);
    expect(JSON.stringify(groups)).not.toContain('Hidden Room');
  });
});
