import { describe, expect, it } from 'vitest';
import { formatScheduleShort, scheduleDaysUz } from '../utils/schedule';

describe('group schedule in Uzbek', () => {
  const section = JSON.stringify({ days: ['Tuesday', 'Thursday', 'Saturday'], time: '14:00', endTime: '15:30' });

  it('shows short weekdays and the time', () => {
    expect(formatScheduleShort(section)).toBe('Se · Pa · Sha 14:00–15:30');
    expect(formatScheduleShort('')).toBe('');
  });

  it('lets an admin search by Uzbek day names', () => {
    expect(scheduleDaysUz(section)).toBe('Seshanba Payshanba Shanba');
  });
});
