import type { Class, ClassSchedule } from './types';

export const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const parseSchedule = (section?: string): ClassSchedule => {
  if (!section) return { days: [], time: '09:00' };
  try {
    const parsed = JSON.parse(section) as Partial<ClassSchedule>;
    return {
      days: Array.isArray(parsed.days) ? parsed.days : [],
      time: typeof parsed.time === 'string' ? parsed.time : '09:00',
    };
  } catch {
    return { days: [], time: '09:00' };
  }
};

export const formatSchedule = (cls: Class) => {
  const schedule = parseSchedule(cls.section);
  return schedule.days.length > 0 ? `${schedule.days.join(', ')} at ${schedule.time}` : cls.section || 'Not set';
};

