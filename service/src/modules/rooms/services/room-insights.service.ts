const repository = require('../repositories/room-insights.repository');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const parseId = (value: any) => value == null || value === '' ? undefined : Number(value);
const requireDate = (value: any, name: string) => {
  if (!ISO_DATE.test(String(value || ''))) throw Object.assign(new Error(`${name} must use YYYY-MM-DD format`), { status: 400 });
  return String(value);
};
const requireTime = (value: any, name: string) => {
  const normalized = String(value || '').substring(0, 5);
  if (!TIME.test(normalized)) throw Object.assign(new Error(`${name} must use HH:mm format`), { status: 400 });
  return normalized;
};

const getSchedule = (centerId: number, query: any) => repository.schedule(centerId, {
  date: query.date ? requireDate(query.date, 'date') : undefined,
  from: query.from ? requireDate(query.from, 'from') : undefined,
  to: query.to ? requireDate(query.to, 'to') : undefined,
  roomId: parseId(query.room_id), teacherId: parseId(query.teacher_id), subjectId: parseId(query.subject_id),
});

const getAvailability = (centerId: number, query: any) => {
  const date = requireDate(query.date, 'date');
  const start = requireTime(query.start, 'start');
  const end = requireTime(query.end, 'end');
  if (end <= start) throw Object.assign(new Error('end must be after start'), { status: 400 });
  return repository.availability(centerId, date, start, end);
};

const getOverview = async (centerId: number, query: any) => {
  const date = requireDate(query.date, 'date');
  const start = requireTime(query.start || '08:00', 'start');
  const end = requireTime(query.end || '21:00', 'end');
  const [rooms, availability, schedule] = await Promise.all([
    repository.physicalRooms(centerId), repository.availability(centerId, date, start, end),
    repository.schedule(centerId, { date }),
  ]);
  return {
    date, summary: {
      total_rooms: rooms.length,
      available_rooms: availability.filter((room: any) => room.available).length,
      occupied_rooms: availability.filter((room: any) => !room.available).length,
      scheduled_lessons: schedule.length,
    }, rooms, availability, schedule,
  };
};

const groupSchedule = async (centerId: number, query: any, key: 'teacher' | 'subject') => {
  const rows = await getSchedule(centerId, query);
  const idKey = `${key}_id`; const nameKey = `${key}_name`;
  const groups = new Map<string, any>();
  rows.forEach((row: any) => {
    const id = row[idKey]; const mapKey = String(id ?? 'unassigned');
    if (!groups.has(mapKey)) groups.set(mapKey, { [`${key}_id`]: id, [`${key}_name`]: row[nameKey] || `Unassigned ${key}`, bookings: [] });
    groups.get(mapKey).bookings.push(row);
  });
  return Array.from(groups.values());
};

const getReport = (centerId: number, query: any) => {
  const from = requireDate(query.from, 'from'); const to = requireDate(query.to, 'to');
  if (to < from) throw Object.assign(new Error('to must be on or after from'), { status: 400 });
  return repository.utilization(centerId, from, to);
};

const updatePhysicalRoom = (id: number, centerId: number, data: any) => {
  if (data.capacity != null && (!Number.isInteger(Number(data.capacity)) || Number(data.capacity) <= 0))
    throw Object.assign(new Error('capacity must be a positive integer'), { status: 400 });
  if (data.features != null && !Array.isArray(data.features))
    throw Object.assign(new Error('features must be an array'), { status: 400 });
  if (data.status != null && !['active', 'inactive', 'maintenance'].includes(String(data.status).toLowerCase()))
    throw Object.assign(new Error('status must be active, inactive, or maintenance'), { status: 400 });
  if (data.operating_start_time) requireTime(data.operating_start_time, 'operating_start_time');
  if (data.operating_end_time) requireTime(data.operating_end_time, 'operating_end_time');
  return repository.updatePhysicalRoom(id, centerId, data);
};

module.exports = {
  getPhysicalRooms: repository.physicalRooms, updatePhysicalRoom, getOverview, getAvailability, getSchedule,
  getByTeacher: (centerId: number, query: any) => groupSchedule(centerId, query, 'teacher'),
  getBySubject: (centerId: number, query: any) => groupSchedule(centerId, query, 'subject'), getReport,
};
export {};
