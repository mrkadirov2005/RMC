// Shared utility helpers.

import type { CalendarDay } from './types';
import { weekDays } from '@/features/crm/classes/queries';

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
  const firstDay = new Date(year, month, 1).getDay();
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

// Returns time slots.
export const getTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let h = 8; h <= 18; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
};

const DEFAULT_DURATION_KEY = 'lesson_duration_default';
const OVERRIDE_DURATION_KEY = 'lesson_duration_override';

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
