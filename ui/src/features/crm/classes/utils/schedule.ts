import type { ClassSchedule } from '../types';

export const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const parseSchedule = (section?: string): ClassSchedule => {
  if (!section) return { days: [], time: '', endTime: '' };
  try {
    const parsed = JSON.parse(section);
    return {
      days: Array.isArray(parsed?.days) ? parsed.days.map((day: unknown) => String(day)) : [],
      time: String(parsed?.time || ''),
      endTime: String(parsed?.endTime || ''),
    };
  } catch {
    return { days: [], time: '', endTime: '' };
  }
};

export const getScheduleDurationMinutes = (schedule: ClassSchedule) => {
  if (!schedule.time || !schedule.endTime) return 90;
  const [startHoursRaw, startMinutesRaw] = schedule.time.split(':');
  const [endHoursRaw, endMinutesRaw] = schedule.endTime.split(':');
  const startHours = Number(startHoursRaw);
  const startMinutes = Number(startMinutesRaw);
  const endHours = Number(endHoursRaw);
  const endMinutes = Number(endMinutesRaw);
  if (![startHours, startMinutes, endHours, endMinutes].every(Number.isFinite)) return 90;
  const duration = endHours * 60 + endMinutes - (startHours * 60 + startMinutes);
  return duration > 0 ? duration : 90;
};
