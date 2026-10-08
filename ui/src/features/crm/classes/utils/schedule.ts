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

// Uzbek short weekday names, as the admins say them when placing a student ("sesh-pay-shanba").
const UZ_DAY_SHORT: Record<string, string> = {
  monday: 'Du', tuesday: 'Se', wednesday: 'Cho', thursday: 'Pa', friday: 'Ju', saturday: 'Sha', sunday: 'Ya',
};
const UZ_DAY_FULL: Record<string, string> = {
  monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba', thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
};

/** "Se · Pa · Sha 14:00–15:30", or '' when the group has no schedule. */
export const formatScheduleShort = (section?: string) => {
  const schedule = parseSchedule(section);
  const days = schedule.days.map((day) => UZ_DAY_SHORT[day.trim().toLowerCase()] || day).join(' · ');
  const time = [schedule.time, schedule.endTime].filter(Boolean).join('–');
  return [days, time].filter(Boolean).join(' ');
};

/** Uzbek full day names of a group's schedule, for searching ("seshanba"). */
export const scheduleDaysUz = (section?: string) =>
  parseSchedule(section).days.map((day) => UZ_DAY_FULL[day.trim().toLowerCase()] || day).join(' ');
