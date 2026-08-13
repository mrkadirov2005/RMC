import type { CalendarEvent } from './calendarWorkspace';

export const ROOM_BAND_SIZE = 5;
export const weekdayPatterns = [
  { id: 'mwf', label: 'Monday · Wednesday · Friday', weekdays: [1, 3, 5] },
  { id: 'tts', label: 'Tuesday · Thursday · Saturday', weekdays: [2, 4, 6] },
  { id: 'sun', label: 'Sunday', weekdays: [0] },
];

const roomOrder = (value: string) => Number(value.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
export const sortRoomNames = (rooms: string[]) => [...new Set(rooms.filter(Boolean))]
  .sort((a, b) => roomOrder(a) - roomOrder(b) || a.localeCompare(b, undefined, { numeric: true }));

export const groupRoomBands = (rooms: string[], size = ROOM_BAND_SIZE) => {
  const sorted = sortRoomNames(rooms);
  return Array.from({ length: Math.ceil(sorted.length / size) }, (_, index) => sorted.slice(index * size, (index + 1) * size));
};

export const patternForEvent = (event: CalendarEvent) => weekdayPatterns.find(pattern =>
  pattern.weekdays.includes(new Date(`${event.date}T00:00:00`).getDay())
);

export const buildPatternRows = (events: CalendarEvent[], roomNames: string[]) => {
  const eventsByRoom = new Map(roomNames.map(room => {
    const unique = new Map<string, CalendarEvent>();
    events
      .filter(event => event.room_name === room)
      .sort((a, b) => a.start_time.localeCompare(b.start_time) || a.end_time.localeCompare(b.end_time))
      .forEach(event => {
        const key = `${event.start_time}|${event.end_time}|${event.class_id ?? event.class_name}|${event.teacher_id ?? event.teacher_name ?? ''}`;
        if (!unique.has(key)) unique.set(key, event);
      });
    return [room, [...unique.values()]] as const;
  }));
  const rowCount = Math.max(0, ...roomNames.map(room => eventsByRoom.get(room)?.length || 0));
  return Array.from({ length: rowCount }, (_, index) => ({
    index,
    byRoom: new Map(roomNames.map(room => [room, eventsByRoom.get(room)?.[index]])),
  }));
};

export const buildTimeGridRows = (events: CalendarEvent[], roomNames: string[], slots: Array<{ start: string; end: string }>) =>
  slots.map((slot, index) => ({
    ...slot,
    index,
    byRoom: new Map(roomNames.map(room => [room, events.find(event =>
      event.room_name === room && event.start_time.slice(0, 5) >= slot.start && event.start_time.slice(0, 5) < slot.end
    )])),
  }));
