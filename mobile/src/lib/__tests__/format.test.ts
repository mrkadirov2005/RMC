import type { ScheduleSlot } from '../../api/types';
import { attendanceTone, initials, money, nextLesson, shortDate } from '../format';

const slot = (day: string, start: string, end: string, name = day): ScheduleSlot => ({
  class_id: 1,
  class_name: name,
  teacher_name: null,
  day,
  start_time: start,
  end_time: end,
  room: null,
});

// @MOB-120 Next lesson and display helpers.
describe('format helpers', () => {
  // 2026-11-02 is a Monday.
  const mondayAt = (h: number, m = 0) => new Date(2026, 10, 2, h, m);

  it('picks a lesson later today', () => {
    const slots = [slot('Monday', '09:00:00', '10:00:00', 'early'), slot('Monday', '14:00:00', '15:30:00', 'late')];
    expect(nextLesson(slots, mondayAt(11))).toEqual({ slot: slots[1], daysAhead: 0 });
  });

  it('keeps a lesson that is in progress', () => {
    const slots = [slot('Monday', '14:00', '15:30')];
    expect(nextLesson(slots, mondayAt(15))?.daysAhead).toBe(0);
  });

  it('moves to the next teaching day after the last lesson', () => {
    const slots = [slot('Monday', '09:00', '10:00'), slot('Wednesday', '16:00', '17:00')];
    expect(nextLesson(slots, mondayAt(18))).toEqual({ slot: slots[1], daysAhead: 2 });
  });

  it('wraps around to next week and returns null with no lessons', () => {
    const slots = [slot('Monday', '09:00', '10:00')];
    expect(nextLesson(slots, mondayAt(12))).toEqual({ slot: slots[0], daysAhead: 7 });
    expect(nextLesson([], mondayAt(12))).toBeNull();
  });

  it('formats money, dates and initials', () => {
    expect(money(480000, "so'm")).toBe("480 000 so'm");
    expect(shortDate('2026-11-05T00:00:00Z')).toBe('05.11.2026');
    expect(shortDate(null)).toBe('');
    expect(initials('aziza', 'karimova')).toBe('AK');
    expect(initials(null, null)).toBe('?');
  });

  it('colors attendance statuses', () => {
    expect(['Present', 'Late', 'Excused', 'Absent NR', 'Other'].map(attendanceTone)).toEqual(['ok', 'warn', 'warn', 'bad', 'blue']);
  });
});
