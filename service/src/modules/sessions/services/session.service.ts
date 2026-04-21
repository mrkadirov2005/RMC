const classRepository = require('../../classes/repositories/class.repository');
const sessionRepository = require('../repositories/session.repository');

const dayIndexToName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const normalizeDayName = (value: unknown) => {
  if (typeof value === 'number') {
    if (value >= 0 && value <= 6) return dayIndexToName[value].toLowerCase();
    return '';
  }
  if (typeof value !== 'string') return '';
  const raw = value.trim().toLowerCase();
  if (!raw) return '';
  if (raw.length <= 3) {
    const short = raw.slice(0, 3);
    const map: Record<string, string> = {
      sun: 'sunday',
      mon: 'monday',
      tue: 'tuesday',
      wed: 'wednesday',
      thu: 'thursday',
      fri: 'friday',
      sat: 'saturday',
    };
    return map[short] || '';
  }
  return raw;
};

const parseSchedule = (section?: string) => {
  if (!section) return { days: [], time: '' };
  try {
    const parsed = JSON.parse(section);
    const days = Array.isArray(parsed.days) ? parsed.days : [];
    const time = typeof parsed.time === 'string' ? parsed.time : '';
    return { days, time };
  } catch {
    return { days: [], time: '' };
  }
};

const toLocalDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number(hoursRaw);
  const mins = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return time;
  const total = hours * 60 + mins + minutes;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMins = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
};

const generateMonthlySessions = async (params: {
  classId: number;
  centerId?: number;
  teacherId?: number;
  month: number;
  year: number;
  durationMinutes: number;
}) => {
  const { classId, centerId, teacherId, month, year, durationMinutes } = params;
  const cls = await classRepository.findById(classId, centerId, teacherId);
  if (!cls) return { error: 'not_found' as const };

  const schedule = parseSchedule(cls.section);
  if (!schedule.days.length || !schedule.time) {
    return { error: 'missing_schedule' as const };
  }

  const scheduleDays = schedule.days
    .map(normalizeDayName)
    .filter((day: string) => day.length > 0);

  const monthIndex = month - 1;
  const daysInMonth = new Date(year, month, 0).getDate();
  const sessions: any[] = [];

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateObj = new Date(year, monthIndex, day);
    const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const matches = scheduleDays.includes(weekdayName);
    if (!matches) continue;

    const sessionDate = toLocalDateKey(dateObj);
    sessions.push({
      center_id: cls.center_id,
      class_id: cls.class_id,
      teacher_id: cls.teacher_id || null,
      session_date: sessionDate,
      start_time: schedule.time,
      duration_minutes: durationMinutes,
      end_time: addMinutesToTime(schedule.time, durationMinutes),
    });
  }

  const result = await sessionRepository.bulkInsert(sessions);
  return {
    created: result.created,
    total: sessions.length,
    skipped: Math.max(sessions.length - result.created, 0),
  };
};

const listByClass = (classId: number, centerId?: number, teacherId?: number) =>
  sessionRepository.findByClass(classId, centerId, teacherId);

const deleteUpcomingSessions = (params: {
  classId: number;
  fromDate: string;
  toDate?: string;
  centerId?: number;
  teacherId?: number;
}) => {
  const { classId, fromDate, toDate, centerId, teacherId } = params;
  return sessionRepository.deleteUpcoming(classId, fromDate, toDate, centerId, teacherId);
};

const deleteSessionById = (params: {
  classId: number;
  sessionId: number;
  centerId?: number;
  teacherId?: number;
}) => {
  const { classId, sessionId, centerId, teacherId } = params;
  return sessionRepository.deleteById(classId, sessionId, centerId, teacherId);
};

const createSession = async (params: {
  classId: number;
  centerId?: number;
  teacherId?: number;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
}) => {
  const { classId, centerId, teacherId, sessionDate, startTime, durationMinutes } = params;
  
  // Get class details if centerId/teacherId missing
  const cls = await classRepository.findById(classId, centerId, teacherId);
  if (!cls) throw new Error('Class not found');

  return sessionRepository.create({
    center_id: centerId || cls.center_id,
    class_id: classId,
    teacher_id: teacherId || cls.teacher_id,
    session_date: sessionDate,
    start_time: startTime,
    duration_minutes: durationMinutes,
    end_time: addMinutesToTime(startTime, durationMinutes),
  });
};

module.exports = { 
  createSession,
  generateMonthlySessions, 
  listByClass, 
  deleteUpcomingSessions, 
  deleteSessionById 
};


export {};
