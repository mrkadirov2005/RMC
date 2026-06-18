// Query helpers for the crm feature.

import type { Class, ClassSchedule } from './types';

export const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Parses schedule.
export const parseSchedule = (section?: string): ClassSchedule => {
  if (!section) return { days: [], time: '09:00', endTime: '10:00' };
  try {
    const parsed = JSON.parse(section) as Partial<ClassSchedule>;
    return {
      days: Array.isArray(parsed.days) ? parsed.days : [],
      time: typeof parsed.time === 'string' ? parsed.time : '09:00',
      endTime: typeof parsed.endTime === 'string' ? parsed.endTime : '10:00',
    };
  } catch {
    return { days: [], time: '09:00', endTime: '10:00' };
  }
};

// Formats schedule.
export const formatSchedule = (cls: Class) => {
  const schedule = parseSchedule(cls.section);
  const timeRange = schedule.endTime ? `${schedule.time} - ${schedule.endTime}` : schedule.time;
  return schedule.days.length > 0 ? `${schedule.days.join(', ')} at ${timeRange}` : cls.section || 'Not set';
};
