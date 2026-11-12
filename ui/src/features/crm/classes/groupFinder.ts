// Finding a group for a new student (Sinflar): by level, odd or even days, morning or afternoon
// session and start time, with the groups that have the most free places first, so the emptiest
// groups fill up before a full one.

import { parseSchedule } from './queries';

export type DayPattern = 'odd' | 'even' | 'other';
export type Session = 'morning' | 'afternoon';

const ODD_DAYS = ['Monday', 'Wednesday', 'Friday'];
const EVEN_DAYS = ['Tuesday', 'Thursday', 'Saturday'];

/** The usual start times: morning 8:00/8:30, 9:30/10:00, 11:00/11:30; afternoon 13:30/14:00, 15:00/15:30, 16:30/17:00. */
export const SESSION_SLOTS = ['08:00', '08:30', '09:30', '10:00', '11:00', '11:30', '13:30', '14:00', '15:00', '15:30', '16:30', '17:00'];

export const dayPatternOf = (days: string[]): DayPattern => {
  if (days.length === 0) return 'other';
  if (days.every((day) => ODD_DAYS.includes(day))) return 'odd';
  if (days.every((day) => EVEN_DAYS.includes(day))) return 'even';
  return 'other';
};

export const sessionOf = (time: string): Session => (String(time || '').slice(0, 5) < '12:00' ? 'morning' : 'afternoon');

type GroupLike = { section?: string; capacity?: number | string | null; level_id?: number | null };

export type GroupFilters = { levelId?: number | null; days?: DayPattern | ''; session?: Session | ''; start?: string; mostFreeFirst?: boolean };

/** Free places: capacity minus students; null when the group has no capacity set. */
export const freePlacesOf = (group: GroupLike, students: number) => {
  const capacity = Number(group.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? capacity - students : null;
};

export const describeGroup = (group: GroupLike) => {
  const schedule = parseSchedule(group.section);
  return { days: dayPatternOf(schedule.days), session: sessionOf(schedule.time), start: String(schedule.time || '').slice(0, 5) };
};

export const filterGroups = <T extends GroupLike>(groups: T[], filters: GroupFilters, studentsOf: (group: T) => number): T[] => {
  const picked = groups.filter((group) => {
    const info = describeGroup(group);
    if (filters.levelId && Number(group.level_id) !== Number(filters.levelId)) return false;
    if (filters.days && info.days !== filters.days) return false;
    if (filters.session && info.session !== filters.session) return false;
    if (filters.start && info.start !== filters.start) return false;
    return true;
  });
  if (!filters.mostFreeFirst) return picked;
  // Morning before afternoon, then the most free places first; groups without a capacity last.
  return [...picked].sort((a, b) => {
    const session = Number(describeGroup(a).session === 'afternoon') - Number(describeGroup(b).session === 'afternoon');
    if (session) return session;
    const freeA = freePlacesOf(a, studentsOf(a));
    const freeB = freePlacesOf(b, studentsOf(b));
    if (freeA === null && freeB === null) return 0;
    if (freeA === null) return 1;
    if (freeB === null) return -1;
    return freeB - freeA;
  });
};
