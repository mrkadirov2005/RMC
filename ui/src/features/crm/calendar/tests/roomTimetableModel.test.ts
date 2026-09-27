import { describe, expect, it } from 'vitest';
import { buildPatternRows, buildTimeGridRows, groupRoomBands, patternForEvent } from '../roomTimetableModel';
import type { CalendarEvent } from '../calendarWorkspace';

const lesson = (changes: Partial<CalendarEvent>): CalendarEvent => ({
  event_id: 'lesson', source: 'recurring', status: 'planned', date: '2026-08-10',
  start_time: '08:00', end_time: '09:30', class_id: 1, class_name: 'A1 Movers', room_name: '1 xona', ...changes,
});

describe('room timetable sheet model', () => {
  it('sorts rooms numerically and divides them into six-room bands', () => {
    expect(groupRoomBands(['10 xona', '2 xona', '6 xona', '1 xona', '5 xona', '4 xona', '3 xona'])).toEqual([
      ['1 xona', '2 xona', '3 xona', '4 xona', '5 xona', '6 xona'], ['10 xona'],
    ]);
  });

  it('groups lesson dates into the client weekday patterns', () => {
    expect(patternForEvent(lesson({ date: '2026-08-10' }))?.id).toBe('mwf');
    expect(patternForEvent(lesson({ date: '2026-08-11' }))?.id).toBe('tts');
  });

  it('builds one parallel schedule column per room and keeps empty rooms free', () => {
    const event = lesson({});
    const [row] = buildPatternRows([event], ['1 xona', '2 xona']);
    expect(row.byRoom.get('1 xona')).toBe(event);
    expect(row.byRoom.get('2 xona')).toBeUndefined();
  });

  it('deduplicates repeating weekday instances and aligns rooms by lesson order', () => {
    const monday = lesson({ event_id: 'monday' });
    const wednesday = lesson({ event_id: 'wednesday', date: '2026-08-12' });
    const later = lesson({ event_id: 'later', room_name: '2 xona', start_time: '08:30', end_time: '10:00' });
    const rows = buildPatternRows([monday, wednesday, later], ['1 xona', '2 xona']);
    expect(rows).toHaveLength(1);
    expect(rows[0].byRoom.get('1 xona')).toBe(monday);
    expect(rows[0].byRoom.get('2 xona')).toBe(later);
  });

  it('builds rows from actual lesson starts and deduplicates repeated weekdays', () => {
    const monday = lesson({ event_id: 'monday', start_time: '08:30:00', end_time: '10:00:00' });
    const wednesday = lesson({ event_id: 'wednesday', date: '2026-08-12', start_time: '08:30:00', end_time: '10:00:00' });
    const later = lesson({ event_id: 'later', room_name: '2 xona', start_time: '10:00:00', end_time: '11:30:00' });
    const rows = buildTimeGridRows([monday, wednesday, later], ['1 xona', '2 xona']);

    expect(rows.map(row => row.start)).toEqual(['08:30', '10:00']);
    expect(rows[0].byRoom.get('1 xona')).toEqual([monday]);
    expect(rows[0].byRoom.get('2 xona')).toEqual([]);
    expect(rows[1].byRoom.get('2 xona')).toEqual([later]);
  });

  it('keeps distinct same-room lessons that start at the same time visible', () => {
    const first = lesson({ event_id: 'first', class_id: 1 });
    const second = lesson({ event_id: 'second', class_id: 2, class_name: 'A2 Flyers' });
    const rows = buildTimeGridRows([first, second], ['1 xona']);

    expect(rows).toHaveLength(1);
    expect(rows[0].byRoom.get('1 xona')).toEqual([first, second]);
  });
});
