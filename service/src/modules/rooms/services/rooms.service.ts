const roomsRepository = require('../repositories/rooms.repository');

const addMinutesToTime = (time: string, minutes: number) => {
  const [hoursRaw, minutesRaw] = String(time || '').split(':');
  const hours = Number(hoursRaw);
  const mins = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return time;
  const total = hours * 60 + mins + minutes;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMins = total % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMins).padStart(2, '0')}`;
};

const minutesFromTime = (time: string) => {
  const [hoursRaw, minutesRaw] = String(time || '').split(':');
  const hours = Number(hoursRaw);
  const mins = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(mins)) return null;
  return hours * 60 + mins;
};

const normalizeTimeWindow = (time: string, endTime?: string) => {
  const start = String(time || '').substring(0, 5);
  const end = String(endTime || addMinutesToTime(start, 60)).substring(0, 5);
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);
  if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
    return { error: 'bad_time_window' as const };
  }
  return { start, end };
};

const getAllRooms = async (centerId: number) => {
  return roomsRepository.findAll(centerId);
};

const getRoomById = async (id: number, centerId: number) => {
  return roomsRepository.findById(id, centerId);
};

const createRoom = async (data: any) => {
  const { center_id, room_number, class_id, day, time, end_time } = data;
  const timeWindow = normalizeTimeWindow(time, end_time);
  if (timeWindow.error) return { error: timeWindow.error };
  const conflict = await roomsRepository.findConflict(center_id, room_number, day, timeWindow.start, timeWindow.end);
  if (conflict) return { error: 'room_unavailable' as const, conflict };
  const row = await roomsRepository.insert([center_id, room_number, class_id || null, day, timeWindow.start, timeWindow.end]);
  if (class_id) await roomsRepository.setClassRoomNumber(Number(class_id), Number(center_id), room_number);
  return row;
};

const updateRoom = async (id: number, data: any, centerId: number) => {
  const { room_number, class_id, day, time, end_time } = data;
  const timeWindow = normalizeTimeWindow(time, end_time);
  if (timeWindow.error) return { error: timeWindow.error };
  const conflict = await roomsRepository.findConflict(centerId, room_number, day, timeWindow.start, timeWindow.end, Number(id));
  if (conflict) return { error: 'room_unavailable' as const, conflict };
  const row = await roomsRepository.update(id, [room_number, class_id || null, day, timeWindow.start, timeWindow.end], centerId);
  if (row && class_id) await roomsRepository.setClassRoomNumber(Number(class_id), Number(centerId), room_number);
  return row;
};

const deleteRoom = async (id: number, centerId: number) => {
  return roomsRepository.remove(id, centerId);
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};

export {};
