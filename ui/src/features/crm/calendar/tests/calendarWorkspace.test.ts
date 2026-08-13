import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS, addDays, filterEvents, localDateKey, startOfWeek, statusTone, viewRange,
  type CalendarEvent,
} from '../calendarWorkspace';

const event = (changes: Partial<CalendarEvent> = {}): CalendarEvent => ({
  event_id: 'planned-1-2026-08-10', source: 'recurring', status: 'planned', date: '2026-08-10',
  start_time: '09:00', end_time: '10:00', class_id: 1, class_name: 'B1 English',
  teacher_id: 2, teacher_name: 'Ada Lovelace', subject_id: 3, subject_name: 'English',
  room_id: 4, room_name: 'Room 101', ...changes,
});

describe('calendar workspace navigation', () => {
  const anchor = new Date(2026, 7, 13, 12);

  it('uses local date keys without UTC date drift', () => {
    expect(localDateKey(anchor)).toBe('2026-08-13');
    expect(localDateKey(addDays(anchor, 1))).toBe('2026-08-14');
  });

  it('starts weeks on Monday and creates inclusive view ranges', () => {
    expect(localDateKey(startOfWeek(anchor))).toBe('2026-08-10');
    expect(viewRange(anchor, 'day')).toEqual({ from: '2026-08-13', to: '2026-08-13' });
    expect(viewRange(anchor, 'week')).toEqual({ from: '2026-08-10', to: '2026-08-16' });
    expect(viewRange(anchor, 'month')).toEqual({ from: '2026-08-01', to: '2026-08-31' });
    expect(viewRange(anchor, 'agenda')).toEqual({ from: '2026-08-13', to: '2026-09-12' });
  });
});

describe('calendar workspace filtering and statuses', () => {
  const events = [event(), event({ event_id: 'session-2', class_id: 7, class_name: 'Math A2', teacher_id: 8, teacher_name: 'Grace Hopper', subject_id: 9, subject_name: 'Math', room_id: 10, room_name: 'Lab', status: 'conducted', source: 'session' })];

  it.each([
    [{ ...EMPTY_FILTERS, query: 'lovelace' }, 'planned-1-2026-08-10'],
    [{ ...EMPTY_FILTERS, query: 'lab' }, 'session-2'],
    [{ ...EMPTY_FILTERS, teacherId: '8' }, 'session-2'],
    [{ ...EMPTY_FILTERS, classId: '1' }, 'planned-1-2026-08-10'],
    [{ ...EMPTY_FILTERS, subjectId: '9' }, 'session-2'],
    [{ ...EMPTY_FILTERS, roomId: '4' }, 'planned-1-2026-08-10'],
    [{ ...EMPTY_FILTERS, status: 'conducted' }, 'session-2'],
  ])('supports a workspace filter %#', (filters, expected) => {
    expect(filterEvents(events, filters).map(row => row.event_id)).toEqual([expected]);
  });

  it('combines filters and treats search case-insensitively', () => {
    expect(filterEvents(events, { ...EMPTY_FILTERS, query: 'MATH', teacherId: '8', status: 'conducted' })).toEqual([events[1]]);
    expect(filterEvents(events, { ...EMPTY_FILTERS, query: 'Math', roomId: '4' })).toEqual([]);
  });

  it('provides readable light and dark tones for supported lifecycle states', () => {
    for (const status of ['planned', 'ready', 'in_progress', 'conducted']) {
      expect(statusTone(status)).toContain('text-');
      expect(statusTone(status)).toContain('dark:');
    }
    expect(statusTone('cancelled')).toContain('text-foreground');
  });
});
