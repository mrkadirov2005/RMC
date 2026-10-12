const { buildWeekly, freeWindows } = require('../room-weekly.service');

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
    const { rooms: [first, second], summary } = buildWeekly(rooms, bookings);
    expect(first.lessons_per_week).toBe(2);
    expect(first.free_seats_per_week).toBe(3);
    expect(first.over_capacity).toEqual([{ class_name: 'A2', students: 14, capacity: 12 }]);
    expect(first.days[0].free).toEqual([{ start: '10:00', end: '12:00' }]);
    expect(first.days[2].free).toEqual([{ start: '08:00', end: '09:00' }, { start: '10:30', end: '12:00' }]);
    expect(first.free_hours_per_week).toBe(2 + 2.5 + 4 * 5);
    expect(second.free_seats_per_week).toBeNull();
    expect(second.opens).toBe('08:00');
    expect(summary).toEqual({ rooms: 2, free_seats_per_week: 3, over_capacity_groups: 1, rooms_without_capacity: 1 });
  });
});
