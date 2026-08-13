import { buildRoomGroups, type RoomAssignment } from './roomModel';
import type { RoomAvailabilityRow, RoomScheduleRow, RoomUtilizationRow, RoomWorkspaceFilters } from './types';

export const todayIso = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const initialRoomFilters = (): RoomWorkspaceFilters => ({
  date: todayIso(), start: '09:00', end: '10:00', room: '', teacherId: '', subject: '',
});

const minutes = (value?: string | null) => {
  const [hours = 0, mins = 0] = String(value || '00:00').slice(0, 5).split(':').map(Number);
  return hours * 60 + mins;
};

export const overlaps = (startA: string, endA: string, startB?: string | null, endB?: string | null) =>
  minutes(startA) < minutes(endB) && minutes(endA) > minutes(startB);

export const weekdayForDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));

export const enrichSchedule = (rooms: RoomAssignment[], classes: any[], teachers: any[]): RoomScheduleRow[] =>
  rooms.filter((room) => Number(room.class_id || 0) > 0).map((room) => {
    const group = classes.find((item) => Number(item.class_id || item.id) === Number(room.class_id));
    const teacherId = Number(group?.teacher_id || 0);
    const teacher = teachers.find((item) => Number(item.teacher_id || item.id) === teacherId);
    return {
      ...room,
      class_name: room.class_name || group?.class_name || group?.name || `Group #${room.class_id}`,
      teacher_id: teacherId || null,
      teacher_name: group?.teacher_name || teacher?.full_name || [teacher?.first_name, teacher?.last_name].filter(Boolean).join(' ') || null,
      subject_name: group?.subject_name || group?.subject?.subject_name || null,
      subject_id: Number(group?.subject_id || group?.subject?.subject_id || 0) || null,
      student_count: Number(group?.student_count || 0),
    };
  });

export const filterSchedule = (rows: RoomScheduleRow[], filters: RoomWorkspaceFilters) => rows.filter((row) => {
  if (filters.room && row.room_number !== filters.room) return false;
  if (filters.teacherId && Number(row.teacher_id) !== Number(filters.teacherId)) return false;
  if (filters.subject && Number(row.subject_id) !== Number(filters.subject)) return false;
  return true;
});

export const deriveAvailability = (rooms: RoomAssignment[], schedule: RoomScheduleRow[], filters: RoomWorkspaceFilters): RoomAvailabilityRow[] => {
  const day = weekdayForDate(filters.date);
  return buildRoomGroups(rooms).map((room) => {
    const conflicts = schedule.filter((item) => item.room_number === room.roomNumber && item.day === day && overlaps(filters.start, filters.end, item.time, item.end_time));
    const later = schedule.filter((item) => item.room_number === room.roomNumber && item.day === day && minutes(item.time) >= minutes(filters.end)).sort((a, b) => minutes(a.time) - minutes(b.time))[0];
    const conflict = conflicts[0];
    return {
      roomId: Number(room.allRows[0]?.room_id || 0), roomNumber: room.roomNumber,
      available: !conflict, nextLesson: conflict?.class_name || later?.class_name || 'No more lessons',
      freeUntil: conflict ? String(conflict.time || '').slice(0, 5) : later ? String(later.time || '').slice(0, 5) : 'End of day', assignment: conflict,
    };
  });
};

export const deriveUtilization = (rooms: RoomAssignment[]): RoomUtilizationRow[] => buildRoomGroups(rooms).map((room) => {
  const bookedMinutes = room.assignments.reduce((sum, row) => sum + Math.max(0, minutes(row.end_time) - minutes(row.time)), 0);
  const availableMinutes = 7 * 12 * 60;
  return { roomNumber: room.roomNumber, bookedMinutes, availableMinutes, utilization: Math.round((bookedMinutes / availableMinutes) * 100) };
});
