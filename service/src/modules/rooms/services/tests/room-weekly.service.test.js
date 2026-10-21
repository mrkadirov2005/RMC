const { buildWeekly, freeWindows, parseFreeQuery, findFreeRooms } = require('../room-weekly.service');

// Monday 2026-10-19, 09:00 in Tashkent.
const MONDAY_9 = new Date('2026-10-19T04:00:00Z');

describe('rooms over the week', () => {
  it('finds free windows of 30 minutes or more inside opening hours', () => {
    expect(freeWindows(480, 1260, [{ start: 600, end: 690 }, { start: 700, end: 790 }, { start: 1200, end: 1260 }])).toEqual([
      { start: '08:00', end: '10:00' },
      { start: '13:10', end: '20:00' },
    ]);
    expect(freeWindows(480, 600, [])).toEqual([{ start: '08:00', end: '10:00' }]);
  });

  it('counts free seats, free hours and groups larger than the room', () => {
    const rooms = [{ room_id: 1, name: '101', capacity: 12, opens: '08:00:00', closes: '12:00:00' }, { room_id: 2, name: '102', capacity: null, opens: null, closes: null }];
    const bookings = [
      { room_id: 1, day: 'monday', start: '08:00', end: '10:00', class_name: 'B1', students: 9 },
      { room_id: 1, day: 'wednesday', start: '09:00', end: '10:30', class_name: 'A2', students: 14 },
      { room_id: 2, day: 'monday', start: '14:00', end: '15:00', class_name: 'Kids', students: 5 },
    ];
    const { rooms: [first, second], summary } = buildWeekly(rooms, bookings, MONDAY_9);
    expect(first.lessons_per_week).toBe(2);
    expect(first.free_seats_per_week).toBe(3);
    expect(first.over_capacity).toEqual([{ class_name: 'A2', students: 14, capacity: 12 }]);
    expect(first.days[0].free).toEqual([{ start: '10:00', end: '12:00' }]);
    expect(first.days[2].free).toEqual([{ start: '08:00', end: '09:00' }, { start: '10:30', end: '12:00' }]);
    expect(first.free_hours_per_week).toBe(2 + 2.5 + 4 * 5);
    expect(second.free_seats_per_week).toBeNull();
    expect(second.opens).toBe('08:00');
    expect(summary).toEqual({
      rooms: 2, free_seats_per_week: 3, over_capacity_groups: 1, rooms_without_capacity: 1,
      now: { day: 'monday', time: '09:00' }, in_use_now: 1, free_now: 1, in_use_now_percent: 50,
      booked_percent: 13, teaching_days: ['monday', 'wednesday'],
    });
  });

  it('shows how full each room is: seats filled, and opening hours booked on the teaching days', () => {
    const rooms = [{ room_id: 1, name: '101', nickname: 'Katta zal', features: ['TV'], capacity: 12, opens: '08:00:00', closes: '12:00:00' }, { room_id: 2, name: '102', capacity: null, opens: null, closes: null }];
    const bookings = [
      { room_id: 1, day: 'monday', start: '08:00', end: '10:00', class_name: 'B1', teacher_id: 3, teacher_name: 'Aziza K', students: 9 },
      { room_id: 1, day: 'wednesday', start: '09:00', end: '10:30', class_name: 'A2', students: 14 },
      { room_id: 2, day: 'monday', start: '14:00', end: '15:00', class_name: 'Kids', students: 5 },
    ];
    const { rooms: [first, second] } = buildWeekly(rooms, bookings, MONDAY_9);
    expect(first).toMatchObject({ nickname: 'Katta zal', features: ['TV'], seat_fill_percent: 96, booked_percent: 44 });
    expect(first.days[0].lessons[0]).toMatchObject({ teacher_id: 3, teacher_name: 'Aziza K' });
    expect(second).toMatchObject({ nickname: null, features: [], seat_fill_percent: null, booked_percent: 4 });
  });

  it('counts rooms in use by Tashkent time, across the UTC day change', () => {
    const rooms = [{ room_id: 1, name: '101', capacity: 10, opens: '08:00', closes: '21:00' }];
    const bookings = [{ room_id: 1, day: 'monday', start: '01:00', end: '02:00', class_name: 'Night', students: 2 }];
    // Sunday 20:30 UTC is already Monday 01:30 in Tashkent.
    expect(buildWeekly(rooms, bookings, new Date('2026-10-18T20:30:00Z')).summary).toMatchObject({ now: { day: 'monday', time: '01:30' }, in_use_now: 1 });
    expect(buildWeekly(rooms, bookings, new Date('2026-10-18T21:00:00Z')).summary).toMatchObject({ in_use_now: 0, free_now: 1 });
    expect(buildWeekly(rooms, [], MONDAY_9).summary).toMatchObject({ booked_percent: 0, teaching_days: [], in_use_now_percent: 0 });
  });
});

describe('finding a free room for a weekly lesson', () => {
  const week = () => buildWeekly([
    { room_id: 1, name: '1', capacity: 20, opens: '08:00', closes: '21:00' },
    { room_id: 2, name: '2', nickname: 'Kichik', capacity: 8, opens: '08:00', closes: '21:00' },
    { room_id: 3, name: '10', capacity: null, opens: '08:00', closes: '18:00' },
  ], [
    { room_id: 1, day: 'wednesday', start: '15:00', end: '16:30', class_name: 'B1', teacher_name: 'Aziza K', students: 12 },
    { room_id: 2, day: 'friday', start: '16:00', end: '17:00', class_name: 'A2', students: 6 },
    { room_id: 2, day: 'monday', start: '08:00', end: '09:00', class_name: 'Kids', students: 4 },
  ], MONDAY_9).rooms;

  it('lists rooms free on every day first, then those free on some days with what is in the way', () => {
    const found = findFreeRooms(week(), { days: ['monday', 'wednesday', 'friday'], start: '15:30', end: '17:00' });
    expect(found.rooms.map((room) => [room.name, room.free_on_all, room.free_days])).toEqual([
      ['10', true, ['monday', 'wednesday', 'friday']],
      ['1', false, ['monday', 'friday']],
      ['2', false, ['monday', 'wednesday']],
    ]);
    expect(found.rooms[1].busy).toEqual([{ day: 'wednesday', free: false, reason: 'lesson', lesson: { start: '15:00', end: '16:30', class_name: 'B1', teacher_name: 'Aziza K' } }]);
    expect(found.summary).toEqual({ free_on_all: 1, free_on_some: 2 });
  });

  it('treats a lesson ending exactly when the new one starts as no clash, and a time outside opening hours as closed', () => {
    const found = findFreeRooms(week(), { days: ['wednesday'], start: '16:30', end: '17:30' });
    expect(found.rooms.find((room) => room.name === '1')?.free_on_all).toBe(true);
    const late = findFreeRooms(week(), { days: ['monday'], start: '17:00', end: '19:00' });
    expect(late.rooms.map((room) => room.name)).toEqual(['1', '2']);
    expect(late.rooms).toHaveLength(2);
  });

  it('keeps only rooms big enough for the group, but not rooms whose size is unknown', () => {
    const found = findFreeRooms(week(), { days: ['monday'], start: '12:00', end: '13:00', seats: 15 });
    expect(found.rooms.map((room) => room.name)).toEqual(['1', '10']);
  });

  it('reads and checks the request', () => {
    expect(parseFreeQuery({ days: 'Friday, monday,monday', start: '15:30', end: '17:00', seats: '12' }))
      .toEqual({ days: ['monday', 'friday'], start: '15:30', end: '17:00', seats: 12 });
    expect(parseFreeQuery({ days: ['sunday'], start: '09:00:00', end: '10:00:00' }).seats).toBeNull();
    for (const bad of [
      { days: '', start: '09:00', end: '10:00' },
      { days: 'funday', start: '09:00', end: '10:00' },
      { days: 'monday', start: '9', end: '10:00' },
      { days: 'monday', start: '10:00', end: '10:00' },
      { days: 'monday', start: '09:00', end: '10:00', seats: '0' },
    ]) expect(() => parseFreeQuery(bad)).toThrow(expect.objectContaining({ status: 400 }));
  });
});
