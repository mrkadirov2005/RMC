import { parseSchedule } from './queries';

type ScheduledClass = { class_id?: number; id?: number; class_name?: string; room_number?: string; section?: string };
type RoomAssignment = { class_id?: number | null; class_name?: string | null; room_number?: string; day?: string | null; time?: string | null; end_time?: string | null };
const minutes = (value?: string | null) => { const [h, m] = String(value || '').slice(0, 5).split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : -1; };
const overlaps = (start: string, end: string, otherStart?: string | null, otherEnd?: string | null) => minutes(start) < minutes(otherEnd) && minutes(end) > minutes(otherStart);
const sameRoom = (left?: string, right?: string) => String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();

export const findClassRoomConflict = ({ classes, assignments, room, days, start, end, editingId }: {
  classes: ScheduledClass[]; assignments: RoomAssignment[]; room?: string; days: string[]; start: string; end: string; editingId?: number | null;
}) => {
  if (!room || days.length === 0 || minutes(start) < 0 || minutes(end) <= minutes(start)) return null;
  for (const item of classes) {
    const id = Number(item.class_id || item.id || 0);
    if ((editingId && id === editingId) || !sameRoom(item.room_number, room)) continue;
    const schedule = parseSchedule(item.section);
    const day = days.find((value) => schedule.days.includes(value));
    if (day && overlaps(start, end, schedule.time, schedule.endTime)) return { day, start: schedule.time, end: schedule.endTime, group: item.class_name || `Group #${id}` };
  }
  for (const item of assignments) {
    if ((editingId && Number(item.class_id) === editingId) || !sameRoom(item.room_number, room)) continue;
    const day = days.find((value) => value === item.day);
    if (day && overlaps(start, end, item.time, item.end_time)) return { day, start: String(item.time || '').slice(0, 5), end: String(item.end_time || '').slice(0, 5), group: item.class_name || 'another group' };
  }
  return null;
};
