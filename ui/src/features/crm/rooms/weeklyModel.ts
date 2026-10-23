// The week of each room as GET /rooms/weekly returns it, and what the Rooms screens work out from
// it: the timetable grid (rooms against half hours, one block per day pattern) and room labels.

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export const WEEK_DAYS: readonly WeekDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export type WeeklyLesson = {
  start: string;
  end: string;
  class_id: number | null;
  class_name: string;
  teacher_id: number | null;
  teacher_name: string | null;
  students: number;
  free_seats: number | null;
};

export type WeeklyDay = { day: WeekDay; lessons: WeeklyLesson[]; free: Array<{ start: string; end: string }> };

export type WeeklyRoom = {
  room_id: number;
  name: string;
  nickname: string | null;
  features: string[];
  capacity: number | null;
  opens: string;
  closes: string;
  seat_fill_percent: number | null;
  booked_percent: number;
  days: WeeklyDay[];
  lessons_per_week: number;
  free_seats_per_week: number | null;
  free_hours_per_week: number;
  over_capacity: Array<{ class_name: string; students: number; capacity: number }>;
};

export type WeeklySummary = {
  rooms: number;
  free_seats_per_week: number;
  over_capacity_groups: number;
  rooms_without_capacity: number;
  now: { day: WeekDay; time: string };
  in_use_now: number;
  free_now: number;
  in_use_now_percent: number;
  booked_percent: number;
  teaching_days: WeekDay[];
};

export type Weekly = { rooms: WeeklyRoom[]; summary: WeeklySummary };

/** What the owner sees in the room's own table of rooms: the number, then the extra name in brackets. */
export const roomLabel = (room: { name: string; nickname?: string | null }) =>
  room.nickname ? `${room.name} (${room.nickname})` : room.name;

export const capitalDay = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

/** The day names as lessons are saved: Monday ... Sunday. */
export const ROOM_DAYS = WEEK_DAYS.map(capitalDay);

/** The day patterns groups follow here, one grid each: Mon-Wed-Fri, Tue-Thu-Sat and Sunday. */
export const TIMETABLE_BLOCKS: ReadonlyArray<{ id: string; days: readonly WeekDay[] }> = [
  { id: 'mwf', days: ['monday', 'wednesday', 'friday'] },
  { id: 'tts', days: ['tuesday', 'thursday', 'saturday'] },
  { id: 'sun', days: ['sunday'] },
];

export const STEP_MINUTES = 30;

export const toMinutes = (value: string) => {
  const [hours, mins] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return hours * 60 + mins;
};

export const toClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

/** A lesson as one grid cell: the same group at the same time on several days of the block is one lesson. */
export type BlockLesson = {
  key: string;
  start: string;
  end: string;
  class_id: number | null;
  class_name: string;
  teacher_id: number | null;
  teacher_name: string | null;
  students: number;
  days: WeekDay[];
};

export const blockLessons = (room: WeeklyRoom, days: readonly WeekDay[], teacherId?: number | null): BlockLesson[] => {
  const merged = new Map<string, BlockLesson>();
  room.days.filter((item) => days.includes(item.day)).forEach((item) => {
    item.lessons.forEach((lesson) => {
      if (teacherId != null && Number(lesson.teacher_id) !== teacherId) return;
      const key = `${lesson.class_id ?? lesson.class_name}|${lesson.start}|${lesson.end}`;
      const existing = merged.get(key);
      if (existing) existing.days.push(item.day);
      else merged.set(key, { key, start: lesson.start, end: lesson.end, class_id: lesson.class_id, class_name: lesson.class_name,
        teacher_id: lesson.teacher_id, teacher_name: lesson.teacher_name, students: lesson.students, days: [item.day] });
    });
  });
  return Array.from(merged.values()).sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
};

/** The half-hour slots the grid covers: from the earliest opening to the latest closing of any room. */
export const gridRange = (rooms: WeeklyRoom[]) => {
  const opens = rooms.map((room) => toMinutes(room.opens));
  const closes = rooms.map((room) => toMinutes(room.closes));
  const from = Math.floor(Math.min(...(opens.length ? opens : [480])) / STEP_MINUTES) * STEP_MINUTES;
  const to = Math.ceil(Math.max(...(closes.length ? closes : [1260])) / STEP_MINUTES) * STEP_MINUTES;
  return { from, slots: Math.max(1, (to - from) / STEP_MINUTES) };
};

export type TimetableCell =
  | { kind: 'lesson'; from: number; span: number; lesson: BlockLesson }
  // Free on every day of the block; spans all lanes of the room.
  | { kind: 'free'; from: number; span: number }
  // Outside the room's opening hours; spans all lanes.
  | { kind: 'closed'; from: number; span: number }
  // Taken by a lesson in another lane of this room.
  | { kind: 'gap'; from: number; span: number };

/**
 * One room's row (or rows) in a block. Lessons that overlap in time on different days of the block
 * go to separate lanes so none hides another. Lane 0 carries the free and closed runs, which span
 * every lane; the other lanes only hold lessons and the gaps beside them.
 */
export const layoutRoomBlock = (lessons: BlockLesson[], room: Pick<WeeklyRoom, 'opens' | 'closes'>, range: { from: number; slots: number }) => {
  const slotAt = (minutes: number, up: boolean) => {
    const value = (minutes - range.from) / STEP_MINUTES;
    return Math.min(range.slots, Math.max(0, up ? Math.ceil(value) : Math.floor(value)));
  };
  const placed = lessons
    .map((lesson) => ({ lesson, from: slotAt(toMinutes(lesson.start), false), to: Math.max(slotAt(toMinutes(lesson.end), true), slotAt(toMinutes(lesson.start), false) + 1) }))
    .filter((item) => item.from < range.slots);

  const lanes: Array<typeof placed> = [];
  placed.forEach((item) => {
    const lane = lanes.find((own) => own[own.length - 1].to <= item.from);
    if (lane) lane.push(item);
    else lanes.push([item]);
  });
  if (lanes.length === 0) lanes.push([]);

  const occupied = new Array<boolean>(range.slots).fill(false);
  placed.forEach((item) => { for (let slot = item.from; slot < Math.min(item.to, range.slots); slot += 1) occupied[slot] = true; });
  const open = (slot: number) => {
    const start = range.from + slot * STEP_MINUTES;
    return start >= toMinutes(room.opens) && start + STEP_MINUTES <= toMinutes(room.closes);
  };

  return lanes.map((lane, index): TimetableCell[] => {
    const cells: TimetableCell[] = [];
    let slot = 0;
    while (slot < range.slots) {
      const own = lane.find((item) => item.from === slot);
      if (own) {
        const span = Math.min(own.to, range.slots) - slot;
        cells.push({ kind: 'lesson', from: slot, span, lesson: own.lesson });
        slot += span;
        continue;
      }
      const kind = occupied[slot] ? 'gap' : open(slot) ? 'free' : 'closed';
      let end = slot + 1;
      while (end < range.slots && !lane.some((item) => item.from === end)
        && (occupied[end] ? 'gap' : open(end) ? 'free' : 'closed') === kind) end += 1;
      if (kind === 'gap' || index === 0) cells.push({ kind, from: slot, span: end - slot });
      slot = end;
    }
    return cells;
  });
};

/** The teachers who have lessons, for the timetable's teacher filter. */
export const teachersOf = (rooms: WeeklyRoom[]) => {
  const found = new Map<number, string>();
  rooms.forEach((room) => room.days.forEach((day) => day.lessons.forEach((lesson) => {
    if (lesson.teacher_id != null && lesson.teacher_name) found.set(Number(lesson.teacher_id), lesson.teacher_name);
  })));
  return Array.from(found, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
};
