import { describe, expect, it } from 'vitest';
import { dayPatternOf, filterGroups, freePlacesOf, sessionOf } from '../groupFinder';

const group = (name: string, days: string[], time: string, capacity: number | null, levelId = 1) =>
  ({ name, section: JSON.stringify({ days, time, endTime: '23:00' }), capacity, level_id: levelId });

const groups = [
  group('A1 morning full', ['Monday', 'Wednesday', 'Friday'], '08:30', 12),
  group('A1 morning empty', ['Monday', 'Wednesday', 'Friday'], '10:00', 12),
  group('A1 afternoon', ['Tuesday', 'Thursday', 'Saturday'], '14:00', 12),
  group('A2 afternoon', ['Tuesday', 'Thursday'], '15:30', 10, 2),
  group('No capacity', ['Monday'], '09:30', null),
];
const students: Record<string, number> = { 'A1 morning full': 12, 'A1 morning empty': 4, 'A1 afternoon': 7, 'A2 afternoon': 3, 'No capacity': 5 };
const studentsOf = (g: { name: string }) => students[g.name];
const names = (rows: Array<{ name: string }>) => rows.map((row) => row.name);

describe('finding a group', () => {
  it('knows odd and even days, and morning and afternoon', () => {
    expect(dayPatternOf(['Monday', 'Wednesday', 'Friday'])).toBe('odd');
    expect(dayPatternOf(['Tuesday', 'Thursday'])).toBe('even');
    expect(dayPatternOf(['Monday', 'Tuesday'])).toBe('other');
    expect(sessionOf('11:30')).toBe('morning');
    expect(sessionOf('13:30')).toBe('afternoon');
  });

  it('filters by level, days, session and start time', () => {
    expect(names(filterGroups(groups, { levelId: 2 }, studentsOf))).toEqual(['A2 afternoon']);
    expect(names(filterGroups(groups, { days: 'even' }, studentsOf))).toEqual(['A1 afternoon', 'A2 afternoon']);
    expect(names(filterGroups(groups, { session: 'morning', levelId: 1 }, studentsOf))).toEqual(['A1 morning full', 'A1 morning empty', 'No capacity']);
    expect(names(filterGroups(groups, { start: '10:00' }, studentsOf))).toEqual(['A1 morning empty']);
  });

  it('puts morning first, then the groups with the most free places; no capacity last', () => {
    expect(names(filterGroups(groups, { levelId: 1, mostFreeFirst: true }, studentsOf)))
      .toEqual(['A1 morning empty', 'A1 morning full', 'No capacity', 'A1 afternoon']);
    expect(freePlacesOf({ capacity: 12 }, 4)).toBe(8);
    expect(freePlacesOf({ capacity: null }, 4)).toBeNull();
  });
});
