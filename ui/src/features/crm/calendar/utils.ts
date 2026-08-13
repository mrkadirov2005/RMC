// Shared utility helpers.

import type { CalendarDay } from './types';
import { weekDays } from '@/features/crm/classes/queries';

export const calendarGroupColorThemes = [
  {
    light: 'border-indigo-300 bg-gradient-to-r from-indigo-100 to-sky-50 text-indigo-950',
    dark: 'dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:bg-none dark:text-indigo-200',
    dot: 'bg-indigo-500',
  },
  {
    light: 'border-emerald-300 bg-gradient-to-r from-emerald-100 to-teal-50 text-emerald-950',
    dark: 'dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:bg-none dark:text-emerald-200',
    dot: 'bg-emerald-500',
  },
  {
    light: 'border-amber-300 bg-gradient-to-r from-amber-100 to-orange-50 text-amber-950',
    dark: 'dark:border-amber-500/30 dark:bg-amber-500/10 dark:bg-none dark:text-amber-200',
    dot: 'bg-amber-500',
  },
  {
    light: 'border-cyan-300 bg-gradient-to-r from-cyan-100 to-blue-50 text-cyan-950',
    dark: 'dark:border-cyan-500/30 dark:bg-cyan-500/10 dark:bg-none dark:text-cyan-200',
    dot: 'bg-cyan-500',
  },
  {
    light: 'border-fuchsia-300 bg-gradient-to-r from-fuchsia-100 to-pink-50 text-fuchsia-950',
    dark: 'dark:border-fuchsia-500/30 dark:bg-fuchsia-500/10 dark:bg-none dark:text-fuchsia-200',
    dot: 'bg-fuchsia-500',
  },
  {
    light: 'border-rose-300 bg-gradient-to-r from-rose-100 to-red-50 text-rose-950',
    dark: 'dark:border-rose-500/30 dark:bg-rose-500/10 dark:bg-none dark:text-rose-200',
    dot: 'bg-rose-500',
  },
  {
    light: 'border-violet-300 bg-gradient-to-r from-violet-100 to-purple-50 text-violet-950',
    dark: 'dark:border-violet-500/30 dark:bg-violet-500/10 dark:bg-none dark:text-violet-200',
    dot: 'bg-violet-500',
  },
  {
    light: 'border-lime-300 bg-gradient-to-r from-lime-100 to-green-50 text-lime-950',
    dark: 'dark:border-lime-500/30 dark:bg-lime-500/10 dark:bg-none dark:text-lime-200',
    dot: 'bg-lime-500',
  },
];

export const getCalendarGroupColorTheme = (classId: number | string | undefined) => {
  const raw = String(classId || '0');
  const numeric = Number(raw);
  const hash = Number.isFinite(numeric)
    ? numeric
    : raw.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return calendarGroupColorThemes[Math.abs(hash) % calendarGroupColorThemes.length];
};

const WEEKDAY_ALIASES: Record<string, string> = {
  sunday: 'Sunday',
  sun: 'Sunday',
  yakshanba: 'Sunday',
  monday: 'Monday',
  mon: 'Monday',
  dushanba: 'Monday',
  dush: 'Monday',
  tuesday: 'Tuesday',
  tue: 'Tuesday',
  seshanba: 'Tuesday',
  sesh: 'Tuesday',
  wednesday: 'Wednesday',
  wed: 'Wednesday',
  chorshanba: 'Wednesday',
  chor: 'Wednesday',
  payshanba: 'Thursday',
  thursday: 'Thursday',
  thu: 'Thursday',
  pay: 'Thursday',
  friday: 'Friday',
  fri: 'Friday',
  juma: 'Friday',
  saturday: 'Saturday',
  sat: 'Saturday',
  shanba: 'Saturday',
};

export const normalizeWeekdayName = (value: unknown) => {
  const key = String(value || '').trim().toLowerCase();
  return WEEKDAY_ALIASES[key] || String(value || '').trim();
};

// Treat the room labels used by the sheet ("1 xona") and API values such as
// "1-xona", "1_xona", and "Room 1" as the same room. Keep arbitrary room
// identifiers (for example "403") intact.
export const normalizeRoomKey = (value: unknown) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  const numberedRoom = normalized.match(/^(?:room\s*)?(\d+)\s*(?:xona)?$/);
  return numberedRoom ? numberedRoom[1] : normalized;
};

export const isWithinScheduleRange = (item: any, isoDate: string) => {
  const startDate = item.start_date ? String(item.start_date).split('T')[0] : '';
  const endDate = item.end_date ? String(item.end_date).split('T')[0] : '';
  if (startDate && isoDate < startDate) return false;
  if (endDate && isoDate > endDate) return false;
  return true;
};

// Handles to local date key.
export const toLocalDateKey = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Builds calendar days.
export const buildCalendarDays = (year: number, month: number): CalendarDay[] => {
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const date = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, date);
// Handles day index.
    const dayIndex = (dateObj.getDay() + 6) % 7;
    days.push({
      date,
      isCurrentMonth: false,
      dayName: weekDays[dayIndex],
      isoDate: toLocalDateKey(dateObj),
    });
  }

  for (let date = 1; date <= daysInMonth; date += 1) {
    const dateObj = new Date(year, month, date);
// Handles day index.
    const dayIndex = (dateObj.getDay() + 6) % 7;
    days.push({
      date,
      isCurrentMonth: true,
      dayName: weekDays[dayIndex],
      isoDate: toLocalDateKey(dateObj),
    });
  }

  const remaining = 42 - days.length;
  for (let date = 1; date <= remaining; date += 1) {
    const dateObj = new Date(year, month + 1, date);
// Handles day index.
    const dayIndex = (dateObj.getDay() + 6) % 7;
    days.push({
      date,
      isCurrentMonth: false,
      dayName: weekDays[dayIndex],
      isoDate: toLocalDateKey(dateObj),
    });
  }

  return days;
};

// Parses time to minutes.
export const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const DEFAULT_DURATION_KEY = 'lesson_duration_default';
const OVERRIDE_DURATION_KEY = 'lesson_duration_override';
export const CALENDAR_DEFAULT_VIEW_KEY = 'calendar_default_view';
export const CALENDAR_DAY_START_HOUR_KEY = 'calendar_day_start_hour';
export const CALENDAR_DAY_END_HOUR_KEY = 'calendar_day_end_hour';
export const CALENDAR_SLOT_DURATION_KEY = 'calendar_slot_duration_minutes';

const readStoredHour = (key: string, fallback: number) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 && value <= 23 ? value : fallback;
  } catch {
    return fallback;
  }
};

// Returns time slots.
export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  const startHour = readStoredHour(CALENDAR_DAY_START_HOUR_KEY, 7);
  const endHour = Math.max(startHour, readStoredHour(CALENDAR_DAY_END_HOUR_KEY, 19));
  for (let minutes = startHour * 60; minutes <= endHour * 60; minutes += 30) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`);
  }
  return slots;
};

// Returns configured lesson duration minutes.
export const getConfiguredLessonDurationMinutes = (): number => {
  const fallback = 90;

  try {
    const overrideRaw = localStorage.getItem(OVERRIDE_DURATION_KEY);
    const overrideValue = Number(overrideRaw);
    if (Number.isFinite(overrideValue) && overrideValue > 0) {
      return overrideValue;
    }

    const defaultRaw = localStorage.getItem(DEFAULT_DURATION_KEY);
    const defaultValue = Number(defaultRaw);
    return Number.isFinite(defaultValue) && defaultValue > 0 ? defaultValue : fallback;
  } catch {
    return fallback;
  }
};

export const getCalendarTimetableSlots = () => {
  const start = readStoredHour(CALENDAR_DAY_START_HOUR_KEY, 8) * 60;
  const end = Math.max(start + 1, readStoredHour(CALENDAR_DAY_END_HOUR_KEY, 22) * 60);
  let duration = 120;
  try {
    const stored = Number(localStorage.getItem(CALENDAR_SLOT_DURATION_KEY));
    if (Number.isFinite(stored) && stored >= 15 && stored <= 480) duration = stored;
  } catch { /* use defaults */ }
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const slots = [];
  for (let cursor = start; cursor < end; cursor += duration) slots.push({ start: format(cursor), end: format(Math.min(cursor + duration, end)) });
  return slots;
};
