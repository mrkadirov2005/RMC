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
const buildWeekly = (rooms: any[], bookings: any[], now: Date = new Date()) => {
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
          teacher_id: booking.teacher_id ?? null, teacher_name: booking.teacher_name ?? null,
          students: Number(booking.students || 0),
          free_seats: capacity == null ? null : capacity - Number(booking.students || 0),
        }))
        .sort((a, b) => a.start.localeCompare(b.start));
      const free = freeWindows(opens, closes, lessons.map((lesson) => ({ start: minutes(lesson.start), end: minutes(lesson.end) })));
      return { day, lessons, free, free_minutes: free.reduce((sum, window) => sum + minutes(window.end) - minutes(window.start), 0) };
    });
    const lessons = days.flatMap((day) => day.lessons);
    const seatsOffered = capacity == null ? 0 : capacity * lessons.length;
    const seatsTaken = lessons.reduce((sum, lesson) => sum + lesson.students, 0);
    return {
      room_id: room.room_id,
      name: room.name,
      nickname: room.nickname || null,
      features: Array.isArray(room.features) ? room.features : [],
      capacity,
      opens: clock(opens),
      closes: clock(closes),
      // How full the room's lessons are on average: students against seats, over every lesson of the week.
      seat_fill_percent: seatsOffered > 0 ? Math.round((100 * seatsTaken) / seatsOffered) : null,
      days,
      lessons_per_week: lessons.length,
      free_seats_per_week: capacity == null ? null : lessons.reduce((sum, lesson) => sum + Math.max(0, lesson.free_seats ?? 0), 0),
      free_hours_per_week: Math.round(days.reduce((sum, day) => sum + day.free_minutes, 0) / 6) / 10,
      over_capacity: lessons.filter((lesson) => lesson.free_seats != null && lesson.free_seats < 0)
        .map((lesson) => ({ class_name: lesson.class_name, students: lesson.students, capacity })),
    };
  });
  // Days with at least one lesson anywhere count as the center's teaching days, so a closed Sunday does not dilute the percentages.
  const teachingDays = WEEK.filter((day) => result.some((room) => room.days.find((item) => item.day === day)!.lessons.length > 0));
  const withUse = result.map((room) => {
    const openMinutes = minutes(room.closes) - minutes(room.opens);
    const booked = teachingDays.reduce((sum, day) => sum + room.days.find((item) => item.day === day)!.lessons
      .reduce((inner, lesson) => inner + Math.max(0, Math.min(minutes(lesson.end), minutes(room.closes)) - Math.max(minutes(lesson.start), minutes(room.opens))), 0), 0);
    const available = openMinutes * teachingDays.length;
    return { ...room, booked_percent: available > 0 ? Math.min(100, Math.round((100 * booked) / available)) : 0, booked_minutes: booked, available_minutes: available };
  });
  const here = tashkentNow(now);
  const inUse = withUse.filter((room) => room.days.find((item) => item.day === here.day)!.lessons
    .some((lesson) => minutes(lesson.start) <= here.minutes && here.minutes < minutes(lesson.end))).length;
  const bookedAll = withUse.reduce((sum, room) => sum + room.booked_minutes, 0);
  const availableAll = withUse.reduce((sum, room) => sum + room.available_minutes, 0);
  return {
    rooms: withUse,
    summary: {
      rooms: withUse.length,
      free_seats_per_week: withUse.reduce((sum, room) => sum + (room.free_seats_per_week || 0), 0),
      over_capacity_groups: withUse.reduce((sum, room) => sum + room.over_capacity.length, 0),
      rooms_without_capacity: withUse.filter((room) => room.capacity == null).length,
      // Right now (Tashkent time): rooms with a lesson going on, and the rest.
      now: { day: here.day, time: clock(here.minutes) },
      in_use_now: inUse,
      free_now: withUse.length - inUse,
      in_use_now_percent: withUse.length ? Math.round((100 * inUse) / withUse.length) : 0,
      // Share of opening hours taken by lessons on the teaching days.
      booked_percent: availableAll > 0 ? Math.min(100, Math.round((100 * bookedAll) / availableAll)) : 0,
      teaching_days: teachingDays,
    },
  };
};

/** The day name and minutes since midnight in Tashkent (UTC+5, no daylight saving). */
const tashkentNow = (now: Date) => {
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  return { day: WEEK[(local.getUTCDay() + 6) % 7], minutes: local.getUTCHours() * 60 + local.getUTCMinutes() };
};

const getWeekly = async (centerId: number) => {
  const [rooms, bookings] = await Promise.all([roomWeeklyRepository.findRooms(centerId), roomWeeklyRepository.findBookings(centerId)]);
  return buildWeekly(rooms, bookings);
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });

/** Reads ?days=monday,wednesday,friday&start=15:00&end=16:30&seats=12 and refuses what does not make sense. */
const parseFreeQuery = (query: any) => {
  const raw = Array.isArray(query.days) ? query.days : String(query.days || '').split(',');
  const days = Array.from(new Set(raw.map((day: any) => String(day).trim().toLowerCase()).filter(Boolean))) as string[];
  if (days.length === 0) throw badRequest("days kamida bitta kunni ko'rsatishi kerak");
  const unknown = days.filter((day) => !WEEK.includes(day));
  if (unknown.length) throw badRequest(`Noma'lum kun: ${unknown.join(', ')}`);
  const start = String(query.start || '').slice(0, 5);
  const end = String(query.end || '').slice(0, 5);
  if (!TIME.test(start)) throw badRequest("start HH:mm formatida bo'lishi kerak");
  if (!TIME.test(end)) throw badRequest("end HH:mm formatida bo'lishi kerak");
  if (end <= start) throw badRequest("end qiymati start dan keyin bo'lishi kerak");
  const seats = query.seats == null || query.seats === '' ? null : Number(query.seats);
  if (seats != null && (!Number.isInteger(seats) || seats <= 0)) throw badRequest("seats musbat butun son bo'lishi kerak");
  return { days: WEEK.filter((day) => days.includes(day)), start, end, seats };
};

/**
 * Which rooms are free for a weekly lesson on these days at this time ("Mon-Wed-Fri 15:30-17:00").
 * A room is free on a day when the time is inside its opening hours and no lesson overlaps it.
 * Rooms free on every day come first, then those free on some days, with what is in the way.
 */
const findFreeRooms = (rooms: any[], { days, start, end, seats }: { days: string[]; start: string; end: string; seats?: number | null }) => {
  const from = minutes(start);
  const to = minutes(end);
  const results = rooms
    .filter((room) => !seats || room.capacity == null || room.capacity >= seats)
    .map((room) => {
      const perDay = days.map((day) => {
        if (from < minutes(room.opens) || to > minutes(room.closes)) return { day, free: false, reason: 'closed' as const, lesson: null };
        const lessons = room.days.find((item: any) => item.day === day)?.lessons || [];
        const clash = lessons.find((lesson: any) => minutes(lesson.start) < to && minutes(lesson.end) > from);
        return clash
          ? { day, free: false, reason: 'lesson' as const, lesson: { start: clash.start, end: clash.end, class_name: clash.class_name, teacher_name: clash.teacher_name ?? null } }
          : { day, free: true, reason: null, lesson: null };
      });
      return {
        room_id: room.room_id, name: room.name, nickname: room.nickname ?? null, capacity: room.capacity, features: room.features ?? [],
        opens: room.opens, closes: room.closes,
        free_days: perDay.filter((item) => item.free).map((item) => item.day),
        busy: perDay.filter((item) => !item.free),
        free_on_all: perDay.every((item) => item.free),
      };
    })
    .filter((room) => room.free_days.length > 0)
    .sort((a, b) => Number(b.free_on_all) - Number(a.free_on_all) || b.free_days.length - a.free_days.length
      || String(a.name).localeCompare(String(b.name), undefined, { numeric: true }));
  return {
    days, start, end, seats: seats ?? null, rooms: results,
    summary: { free_on_all: results.filter((room) => room.free_on_all).length, free_on_some: results.filter((room) => !room.free_on_all).length },
  };
};

const getFree = async (centerId: number, query: any) => {
  const request = parseFreeQuery(query);
  return findFreeRooms((await getWeekly(centerId)).rooms, request);
};

module.exports = { getWeekly, buildWeekly, freeWindows, parseFreeQuery, findFreeRooms, getFree };
export {};
