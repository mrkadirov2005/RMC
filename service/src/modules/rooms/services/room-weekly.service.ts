const roomWeeklyRepository = require('../repositories/room-weekly.repository');

const WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MIN_FREE_MINUTES = 30;

const minutes = (value: string) => {
  const [hours, mins] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return hours * 60 + mins;
};
const clock = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

/** Free windows of at least 30 minutes between the lessons, inside opening hours. */
const freeWindows = (opens: number, closes: number, busy: Array<{ start: number; end: number }>) => {
  const windows: Array<{ start: string; end: string }> = [];
  let cursor = opens;
  [...busy].sort((a, b) => a.start - b.start).forEach((lesson) => {
    if (lesson.start - cursor >= MIN_FREE_MINUTES) windows.push({ start: clock(cursor), end: clock(Math.min(lesson.start, closes)) });
    cursor = Math.max(cursor, lesson.end);
  });
  if (closes - cursor >= MIN_FREE_MINUTES) windows.push({ start: clock(cursor), end: clock(closes) });
  return windows;
};

/**
 * The week of each room: lessons per day with their group size, free windows, free seats (capacity
 * minus students, per lesson) and groups larger than the room.
 */
const buildWeekly = (rooms: any[], bookings: any[]) => {
  const result = rooms.map((room) => {
    const capacity = room.capacity == null ? null : Number(room.capacity);
    const opens = minutes(room.opens || '08:00');
    const closes = minutes(room.closes || '21:00');
    const own = bookings.filter((booking) => Number(booking.room_id) === Number(room.room_id));
    const days = WEEK.map((day) => {
      const lessons = own
        .filter((booking) => booking.day === day)
        .map((booking) => ({
          start: booking.start, end: booking.end, class_id: booking.class_id, class_name: booking.class_name,
          students: Number(booking.students || 0),
          free_seats: capacity == null ? null : capacity - Number(booking.students || 0),
        }))
        .sort((a, b) => a.start.localeCompare(b.start));
      const free = freeWindows(opens, closes, lessons.map((lesson) => ({ start: minutes(lesson.start), end: minutes(lesson.end) })));
      return { day, lessons, free, free_minutes: free.reduce((sum, window) => sum + minutes(window.end) - minutes(window.start), 0) };
    });
    const lessons = days.flatMap((day) => day.lessons);
    return {
      room_id: room.room_id,
      name: room.name,
      capacity,
      opens: clock(opens),
      closes: clock(closes),
      days,
      lessons_per_week: lessons.length,
      free_seats_per_week: capacity == null ? null : lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.free_seats ?? 0), 0),
      free_hours_per_week: Math.round(days.reduce((sum, day) => sum + day.free_minutes, 0) / 6) / 10,
      over_capacity: lessons.filter((lesson) => lesson.free_seats != null && lesson.free_seats < 0)
        .map((lesson) => ({ class_name: lesson.class_name, students: lesson.students, capacity })),
    };
  });
  return {
    rooms: result,
    summary: {
      rooms: result.length,
      free_seats_per_week: result.reduce((sum, room) => sum + (room.free_seats_per_week || 0), 0),
      over_capacity_groups: result.reduce((sum, room) => sum + room.over_capacity.length, 0),
      rooms_without_capacity: result.filter((room) => room.capacity == null).length,
    },
  };
};

const getWeekly = async (centerId: number) => {
  const [rooms, bookings] = await Promise.all([roomWeeklyRepository.findRooms(centerId), roomWeeklyRepository.findBookings(centerId)]);
  return buildWeekly(rooms, bookings);
};

module.exports = { getWeekly, buildWeekly, freeWindows };
export {};
