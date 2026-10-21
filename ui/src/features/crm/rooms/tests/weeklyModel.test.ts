import { describe, expect, it } from 'vitest';
import { blockLessons, gridRange, layoutRoomBlock, roomLabel, teachersOf, type WeeklyRoom, type WeekDay } from '../weeklyModel';

const lesson = (overrides = {}) => ({ start: '15:00', end: '16:30', class_id: 1, class_name: 'B1', teacher_id: 7, teacher_name: 'Aziza K', students: 10, free_seats: 5, ...overrides });
const room = (days: Partial<Record<WeekDay, ReturnType<typeof lesson>[]>>, overrides = {}): WeeklyRoom => ({
  room_id: 1, name: '5', nickname: null, features: [], capacity: 15, opens: '08:00', closes: '21:00', seat_fill_percent: null, booked_percent: 0,
  days: (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as WeekDay[]).map((day) => ({ day, lessons: days[day] || [], free: [] })),
  lessons_per_week: 0, free_seats_per_week: null, free_hours_per_week: 0, over_capacity: [], ...overrides,
});

describe('rooms timetable model', () => {
  it('writes the extra name in brackets after the number', () => {
    expect(roomLabel({ name: '5', nickname: 'Katta zal' })).toBe('5 (Katta zal)');
    expect(roomLabel({ name: '5', nickname: null })).toBe('5');
  });

  it('merges the same group at the same time on several days of a block into one lesson', () => {
    const own = room({ monday: [lesson()], wednesday: [lesson()], friday: [lesson(), lesson({ class_id: 2, class_name: 'A2', start: '17:00', end: '18:00' })], tuesday: [lesson({ class_id: 3 })] });
    const found = blockLessons(own, ['monday', 'wednesday', 'friday']);
    expect(found.map((item) => [item.class_name, item.days])).toEqual([['B1', ['monday', 'wednesday', 'friday']], ['A2', ['friday']]]);
    expect(blockLessons(own, ['monday', 'wednesday', 'friday'], 99)).toEqual([]);
    expect(blockLessons(own, ['tuesday', 'thursday', 'saturday']).map((item) => item.class_id)).toEqual([3]);
  });

  it('covers the earliest opening to the latest closing in half hours', () => {
    expect(gridRange([room({}, { opens: '08:15', closes: '20:40' }), room({}, { opens: '09:00', closes: '21:00' })])).toEqual({ from: 480, slots: 26 });
    expect(gridRange([])).toEqual({ from: 480, slots: 26 });
  });

  it('lays a room out as closed, free and lesson cells', () => {
    const range = { from: 480, slots: 6 }; // 08:00-11:00
    const [lane] = layoutRoomBlock(
      blockLessons(room({ monday: [lesson({ start: '09:00', end: '10:00' })] }), ['monday']),
      { opens: '08:30', closes: '11:00' }, range,
    );
    expect(lane.map((cell) => [cell.kind, cell.from, cell.span])).toEqual([['closed', 0, 1], ['free', 1, 1], ['lesson', 2, 2], ['free', 4, 2]]);
  });

  it('puts lessons that overlap on different days in separate lanes, with gaps beside them', () => {
    const range = { from: 480, slots: 8 }; // 08:00-12:00
    const lessons = blockLessons(room({
      monday: [lesson({ class_id: 1, class_name: 'B1', start: '08:00', end: '10:00' })],
      wednesday: [lesson({ class_id: 2, class_name: 'A2', start: '09:00', end: '11:00' })],
    }), ['monday', 'wednesday']);
    const lanes = layoutRoomBlock(lessons, { opens: '08:00', closes: '12:00' }, range);
    expect(lanes).toHaveLength(2);
    expect(lanes[0].map((cell) => [cell.kind, cell.from, cell.span])).toEqual([['lesson', 0, 4], ['gap', 4, 2], ['free', 6, 2]]);
    expect(lanes[1].map((cell) => [cell.kind, cell.from, cell.span])).toEqual([['gap', 0, 2], ['lesson', 2, 4]]);
  });

  it('gives an empty room one lane that is free for its opening hours', () => {
    const lanes = layoutRoomBlock([], { opens: '08:00', closes: '10:00' }, { from: 480, slots: 6 });
    expect(lanes).toHaveLength(1);
    expect(lanes[0].map((cell) => [cell.kind, cell.span])).toEqual([['free', 4], ['closed', 2]]);
  });

  it('lists each teacher with lessons once', () => {
    const rooms = [room({ monday: [lesson(), lesson({ teacher_id: 3, teacher_name: 'Bobur T' })] }), room({ friday: [lesson()] })];
    expect(teachersOf(rooms)).toEqual([{ id: 7, name: 'Aziza K' }, { id: 3, name: 'Bobur T' }].sort((a, b) => a.name.localeCompare(b.name)));
  });
});
