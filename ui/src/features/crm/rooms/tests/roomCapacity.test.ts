import { describe, expect, it } from 'vitest';
import { groupRoomFits } from '../roomCapacity';

describe('group room fit', () => {
  it('keeps each group’s tightest lesson across rooms and skips rooms without a capacity', () => {
    const fits = groupRoomFits([
      { name: '101', capacity: 18, days: [{ lessons: [{ class_id: 7, class_name: 'B1 Ali', students: 16, free_seats: 2 }] }] },
      { name: '102', capacity: 12, days: [{ lessons: [{ class_id: 7, class_name: 'B1 Ali', students: 16, free_seats: -4 }, { class_id: 9, class_name: 'A2', students: 12, free_seats: 0 }] }] },
      { name: 'Hall', capacity: null, days: [{ lessons: [{ class_id: 11, class_name: 'IELTS', students: 40, free_seats: null }] }] },
    ]);
    expect(fits.get(7)).toEqual({ classId: 7, className: 'B1 Ali', room: '102', students: 16, capacity: 12, freeSeats: -4 });
    expect(fits.get(9)?.freeSeats).toBe(0);
    expect(fits.has(11)).toBe(false);
  });
});
