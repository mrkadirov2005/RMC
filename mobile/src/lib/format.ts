import type { ScheduleSlot } from '../api/types';

const WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fullName = (first?: string | null, last?: string | null) => [first, last].filter(Boolean).join(' ').trim();

export const initials = (first?: string | null, last?: string | null) =>
  `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || '?';

export const money = (amount: number, currency = "so'm") => `${Math.round(amount).toLocaleString('en-US').replace(/,/g, ' ')} ${currency}`;

export const hhmm = (time?: string | null) => (time ? String(time).slice(0, 5) : '');

export const shortDate = (date?: string | null) => {
  if (!date) return '';
  const [y, m, d] = String(date).slice(0, 10).split('-');
  return d && m && y ? `${d}.${m}.${y}` : String(date);
};

// @MOB-120 The next lesson from the weekly timetable, looking from `now` up to a week ahead.
export const nextLesson = (slots: ScheduleSlot[], now: Date = new Date()) => {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (time: string) => {
    const [h, m] = String(time).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  // Up to 7 days ahead: a lesson only on today's weekday, already over, comes back next week.
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = WEEK[(now.getDay() + offset) % 7];
    const candidates = slots
      .filter((slot) => slot.day === day && (offset > 0 || toMinutes(slot.end_time || slot.start_time) > minutesNow))
      .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time));
    if (candidates.length) return { slot: candidates[0], daysAhead: offset };
  }
  return null;
};

export const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const attendanceTone = (status: string): 'ok' | 'warn' | 'bad' | 'blue' => {
  if (status === 'Present') return 'ok';
  if (status === 'Late' || status === 'Excused') return 'warn';
  if (status.startsWith('Absent')) return 'bad';
  return 'blue';
};
