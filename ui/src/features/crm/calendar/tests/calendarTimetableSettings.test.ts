import { afterEach, describe, expect, it } from 'vitest';
import { CALENDAR_DAY_END_HOUR_KEY, CALENDAR_DAY_START_HOUR_KEY, CALENDAR_SLOT_DURATION_KEY, getCalendarTimetableSlots } from '../utils';

describe('calendar timetable settings', () => {
  afterEach(() => localStorage.clear());
  it('defaults to two-hour rows from 08:00 through 22:00', () => {
    expect(getCalendarTimetableSlots()).toEqual([
      { start: '08:00', end: '10:00' }, { start: '10:00', end: '12:00' }, { start: '12:00', end: '14:00' },
      { start: '14:00', end: '16:00' }, { start: '16:00', end: '18:00' }, { start: '18:00', end: '20:00' }, { start: '20:00', end: '22:00' },
    ]);
  });
  it('uses configured day bounds and slot duration', () => {
    localStorage.setItem(CALENDAR_DAY_START_HOUR_KEY, '9'); localStorage.setItem(CALENDAR_DAY_END_HOUR_KEY, '12'); localStorage.setItem(CALENDAR_SLOT_DURATION_KEY, '60');
    expect(getCalendarTimetableSlots()).toEqual([{ start: '09:00', end: '10:00' }, { start: '10:00', end: '11:00' }, { start: '11:00', end: '12:00' }]);
  });
});
