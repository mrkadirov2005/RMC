const repository = require('../repositories/calendar.repository');
const roomInsights = require('../../rooms/services/room-insights.service');

type CalendarScope = { teacherId?: number; classIds?: number[] };
type CalendarQuery = Record<string, unknown>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const bad = (message: string) => Object.assign(new Error(message), { status: 400 });
const parseOptionalId = (value: unknown, name: string) => {
  if (value == null || value === '') return undefined;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw bad(`${name} must be a positive integer`);
  return id;
};
const validateRange = (fromValue: unknown, toValue: unknown) => {
  const from = String(fromValue || '');
  const to = String(toValue || '');
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) throw bad('from and to must use YYYY-MM-DD format');
  if (to < from) throw bad('to must be on or after from');
  const days = Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1;
  if (days > 62) throw bad('Calendar ranges are limited to 62 days');
  return { from, to, days };
};
const cleanTime = (value: unknown) => String(value || '').slice(0, 8);
const overlaps = (a: any, b: any) => cleanTime(a.start_time) < cleanTime(b.end_time)
  && cleanTime(a.end_time) > cleanTime(b.start_time);
const allowedStatuses = new Set(['planned', 'ready', 'in_progress', 'conducted']);
const allowedSources = new Set(['recurring', 'booking', 'session']);
const normalizeDay = (value: unknown) => {
  const day = String(value ?? '').trim().toLowerCase();
  const aliases: Record<string, string> = {
    sun: 'sunday', mon: 'monday', tue: 'tuesday', wed: 'wednesday',
    thu: 'thursday', fri: 'friday', sat: 'saturday',
  };
  return aliases[day.slice(0, 3)] || day;
};
const roomKey = (value: unknown) => String(value ?? '').trim().toLowerCase();
const addMinutes = (time: string, minutes: number) => {
  const [hours, minute] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minute)) return '';
  const total = hours * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const parseDefinition = (row: any) => {
  try {
    const schedule = JSON.parse(row.section);
    const start = String(schedule.time || '').slice(0, 8);
    const end = String(schedule.endTime || addMinutes(start, 60)).slice(0, 8);
    if (!start || !end || end <= start || !Array.isArray(schedule.days)) return null;
    return { ...row, start_time: start, end_time: end, days: schedule.days.map(normalizeDay) };
  } catch {
    return null;
  }
};

const events = async (centerId: number, query: CalendarQuery, scope: CalendarScope = {}) => {
  const { from, to, days } = validateRange(query.from, query.to);
  const requestedTeacherId = parseOptionalId(query.teacher_id, 'teacher_id');
  const classId = parseOptionalId(query.class_id, 'class_id');
  const subjectId = parseOptionalId(query.subject_id, 'subject_id');
  const roomId = parseOptionalId(query.room_id, 'room_id');
  const status = query.status == null || query.status === '' ? undefined : String(query.status);
  const source = query.source == null || query.source === '' ? undefined : String(query.source);
  if (status && !allowedStatuses.has(status)) throw bad('status must be planned, ready, in_progress, or conducted');
  if (source && !allowedSources.has(source)) throw bad('source must be recurring, booking, or session');
  const teacherId = scope.teacherId ?? requestedTeacherId;
  if (scope.classIds && classId && !scope.classIds.includes(classId)) return [];

  const dates = Array.from({ length: days }, (_, index) => {
    const date = new Date(`${from}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
  const [sessions, schedules, definitions, physicalRooms] = await Promise.all([
    repository.datedSessions(centerId, from, to, scope),
    Promise.all(dates.map(async (date) => ({
      date,
      rows: await roomInsights.getSchedule(centerId, {
        date,
        teacher_id: teacherId,
        subject_id: subjectId,
        room_id: roomId,
      }),
    }))),
    repository.recurringDefinitions ? repository.recurringDefinitions(centerId, scope) : Promise.resolve([]),
    roomInsights.getPhysicalRooms(centerId),
  ]);
  const availableRooms = new Map(physicalRooms
    .filter((room: any) => String(room.status || 'active').toLowerCase() === 'active')
    .map((room: any) => [roomKey(room.name || room.room_name), room]));
  const resolveAvailableRoom = (row: any) => {
    const byId = physicalRooms.find((room: any) => Number(room.room_id) === Number(row.room_id || row.physical_room_id));
    const room = byId || availableRooms.get(roomKey(row.room_name));
    return room && String(room.status || 'active').toLowerCase() === 'active' ? room : null;
  };

  const parsedDefinitions = definitions.map(parseDefinition).filter(Boolean);
  const definitionByClass = new Map(parsedDefinitions.map((definition: any) => [Number(definition.class_id), definition]));
  schedules.forEach(({ date, rows }: any) => {
    // A group's recurring timetable is canonical in classes.section. Legacy
    // recurring rows in rooms may contain days that are no longer selected.
    // Keep only dated bookings here; class definitions are projected below.
    rows.splice(0, rows.length, ...rows.filter((row: any) => row.source === 'booking'));
    const weekday = normalizeDay(new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }));
    parsedDefinitions.forEach((definition: any) => {
      if (!definition.days.includes(weekday)) return;
      if (definition.active_from && date < definition.active_from) return;
      if (definition.active_to && date > definition.active_to) return;
      const alreadyProjected = rows.some((row: any) => Number(row.class_id) === Number(definition.class_id));
      if (alreadyProjected) return;
      rows.push({
        assignment_id: `class-${definition.class_id}`,
        source: 'recurring',
        start_time: definition.start_time,
        end_time: definition.end_time,
        class_id: definition.class_id,
        class_name: definition.class_name,
        teacher_id: definition.teacher_id,
        teacher_name: definition.teacher_name,
        subject_id: definition.subject_id,
        subject_name: definition.subject_name,
        physical_room_id: null,
        room_name: definition.room_name,
      });
    });
  });

  const visibleSessions = sessions.filter((row: any) => {
    const definition: any = definitionByClass.get(Number(row.class_id));
    const weekday = normalizeDay(new Date(`${row.date}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }));
    const stillScheduled = !definition || (
      definition.days.includes(weekday)
      && cleanTime(row.start_time) === cleanTime(definition.start_time)
      && cleanTime(row.end_time) === cleanTime(definition.end_time)
    );
    const hasRecordedActivity = Number(row.attendance_marked || 0) > 0;
    return (stillScheduled || hasRecordedActivity)
    && (!teacherId || Number(row.teacher_id) === teacherId)
    && (!classId || Number(row.class_id) === classId)
    && (!subjectId || Number(row.subject_id) === subjectId)
    && (!roomId || Number(row.room_id) === roomId)
  });
  const normalizedSessions = visibleSessions.map((row: any) => {
    const room = resolveAvailableRoom(row);
    if (!room) return null;
    return ({
    event_id: `session-${row.session_id}`,
    session_id: row.session_id,
    source: 'session',
    status: row.attendance_marked >= row.student_count && row.student_count > 0
      ? 'conducted' : row.attendance_marked > 0 ? 'in_progress' : 'ready',
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
    duration_minutes: row.duration_minutes,
    class_id: row.class_id,
    class_name: row.class_name,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    room_id: Number(room.room_id),
    room_name: room.name || room.room_name,
    student_count: row.student_count,
    attendance: {
      present: row.present,
      absent: row.absent,
      unmarked: Math.max(0, row.student_count - row.attendance_marked),
    },
    });
  }).filter(Boolean);

  const planned = schedules.flatMap(({ date, rows }: any) => rows
    .filter((row: any) => !scope.classIds || scope.classIds.includes(Number(row.class_id)))
    .filter((row: any) => !classId || Number(row.class_id) === classId)
    .filter((row: any) => !normalizedSessions.some((session: any) =>
      session.date === date && Number(session.class_id) === Number(row.class_id) && overlaps(session, row)))
    .map((row: any) => {
      const room = resolveAvailableRoom(row);
      if (!room) return null;
      return ({
      event_id: `${row.source === 'booking' ? 'booking' : 'planned'}-${row.assignment_id}-${date}`,
      source: row.source === 'booking' ? 'booking' : 'recurring',
      status: 'planned',
      date,
      start_time: row.start_time,
      end_time: row.end_time,
      class_id: row.class_id,
      class_name: row.class_name,
      teacher_id: row.teacher_id,
      teacher_name: row.teacher_name,
      subject_id: row.subject_id,
      subject_name: row.subject_name,
      room_id: Number(room.room_id),
      room_name: room.name || room.room_name,
      });
    }).filter(Boolean));

  const rows = [...planned, ...normalizedSessions]
    .filter((event: any) => !status || event.status === status)
    .filter((event: any) => !source || event.source === source)
    .sort((a: any, b: any) => `${a.date}|${a.start_time}|${a.class_name}`.localeCompare(`${b.date}|${b.start_time}|${b.class_name}`));
  return rows;
};

const summary = async (centerId: number, query: CalendarQuery, scope: CalendarScope = {}) => {
  const rows = await events(centerId, query, scope);
  return {
    total: rows.length,
    planned: rows.filter((event: any) => event.status === 'planned').length,
    ready: rows.filter((event: any) => event.status === 'ready').length,
    in_progress: rows.filter((event: any) => event.status === 'in_progress').length,
    conducted: rows.filter((event: any) => event.status === 'conducted').length,
    attendance_missing: rows.filter((event: any) => event.source === 'session' && event.attendance?.unmarked > 0).length,
  };
};

const conflicts = async (centerId: number, query: CalendarQuery, scope: CalendarScope = {}) => {
  const rows = await events(centerId, query, scope);
  const found: any[] = [];
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = left + 1; right < rows.length; right += 1) {
      const a = rows[left]; const b = rows[right];
      if (a.date !== b.date || !overlaps(a, b)) continue;
      const reasons: string[] = [];
      if (a.room_id && Number(a.room_id) === Number(b.room_id)) reasons.push('room');
      if (a.teacher_id && Number(a.teacher_id) === Number(b.teacher_id)) reasons.push('teacher');
      if (a.class_id && Number(a.class_id) === Number(b.class_id)) reasons.push('group');
      if (reasons.length) found.push({ event_ids: [a.event_id, b.event_id], reasons });
    }
  }
  return found;
};

const patternDays: Record<string, string[]> = {
  mwf: ['Monday', 'Wednesday', 'Friday'],
  tts: ['Tuesday', 'Thursday', 'Saturday'],
  sun: ['Sunday'],
};
const moveRecurring = async (centerId: number, classId: number, body: any, scope: CalendarScope = {}) => {
  if (!Number.isInteger(classId) || classId <= 0) throw bad('class id must be a positive integer');
  if (scope.classIds && !scope.classIds.includes(classId)) throw Object.assign(new Error('Access denied'), { status: 403 });
  const days = patternDays[String(body.pattern || '')];
  if (!days) throw bad('pattern must be mwf, tts, or sun');
  const roomName = String(body.room_name || '').trim();
  const start = String(body.start_time || '').slice(0, 5);
  const end = String(body.end_time || '').slice(0, 5);
  if (!roomName || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) throw bad('valid room_name, start_time, and end_time are required');
  const rooms = await roomInsights.getPhysicalRooms(centerId);
  const room = rooms.find((item: any) => roomKey(item.name) === roomKey(roomName) && String(item.status || 'active').toLowerCase() === 'active');
  if (!room) throw Object.assign(new Error('The destination room is not active or does not exist.'), { status: 409 });
  const definitions = (await repository.recurringDefinitions(centerId, {})).map(parseDefinition).filter(Boolean);
  const conflict = definitions.find((item: any) => Number(item.class_id) !== classId
    && roomKey(item.room_name) === roomKey(room.name)
    && item.days.some((day: string) => days.map(normalizeDay).includes(day))
    && cleanTime(start) < cleanTime(item.end_time) && cleanTime(end) > cleanTime(item.start_time));
  if (conflict) throw Object.assign(new Error(`${room.name} is already booked by ${conflict.class_name} at ${conflict.start_time}–${conflict.end_time}.`), { status: 409 });
  const row = await repository.updateRecurringSchedule(centerId, classId, JSON.stringify({ days, time: start, endTime: end }), room.name);
  if (!row) throw Object.assign(new Error('Group not found.'), { status: 404 });
  return row;
};

module.exports = {
  events,
  summary,
  conflicts,
  moveRecurring,
  resources: (centerId: number, _query: CalendarQuery, scope: CalendarScope = {}) => repository.resources(centerId, scope),
  studentClassIds: repository.studentClassIds,
};
export {};
