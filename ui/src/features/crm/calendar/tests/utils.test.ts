import { describe, expect, it } from 'vitest';
import { isWithinScheduleRange, normalizeRoomKey } from '../utils';

describe('calendar schedule normalization', () => {
  it('matches sheet room labels with equivalent API room values', () => {
    expect(normalizeRoomKey('1 xona')).toBe('1');
    expect(normalizeRoomKey('1-xona')).toBe('1');
    expect(normalizeRoomKey('1_xona')).toBe('1');
    expect(normalizeRoomKey('Room 1')).toBe('1');
    expect(normalizeRoomKey('403')).toBe('403');
  });

  it('includes recurring lessons only during their active date range', () => {
    const schedule = { start_date: '2026-08-01', end_date: '2026-08-31' };
    expect(isWithinScheduleRange(schedule, '2026-08-10')).toBe(true);
    expect(isWithinScheduleRange(schedule, '2026-09-01')).toBe(false);
  });
});
