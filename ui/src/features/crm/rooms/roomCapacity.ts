import { useEffect, useState } from 'react';
import { roomAPI } from '@/shared/api/api';

/** One group's tightest lesson: the room it is in, how many students it has and how many fit. */
export type GroupRoomFit = { classId: number; className: string; room: string; students: number; capacity: number; freeSeats: number };

type WeeklyLesson = { class_id?: number | string | null; class_name?: string; students?: number; free_seats?: number | null };
type WeeklyRoom = { name?: string; capacity?: number | null; days?: Array<{ lessons?: WeeklyLesson[] }> };

/**
 * Per group, the lesson with the fewest free seats across the week (a group can use different rooms
 * on different days). Rooms without a capacity are left out.
 */
export const groupRoomFits = (rooms: WeeklyRoom[]): Map<number, GroupRoomFit> => {
  const fits = new Map<number, GroupRoomFit>();
  rooms.forEach((room) => {
    if (room.capacity == null) return;
    (room.days || []).forEach((day) => (day.lessons || []).forEach((lesson) => {
      const classId = Number(lesson.class_id || 0);
      if (!classId || lesson.free_seats == null) return;
      const current = fits.get(classId);
      if (current && current.freeSeats <= lesson.free_seats) return;
      fits.set(classId, {
        classId,
        className: lesson.class_name || `#${classId}`,
        room: room.name || '',
        students: Number(lesson.students || 0),
        capacity: Number(room.capacity),
        freeSeats: Number(lesson.free_seats),
      });
    }));
  });
  return fits;
};

let weeklyRequest: Promise<WeeklyRoom[]> | null = null;
const loadWeeklyRooms = () => {
  weeklyRequest ??= roomAPI.getWeekly()
    .then((response: any) => (Array.isArray(response?.data?.rooms) ? response.data.rooms : []))
    .catch(() => {
      weeklyRequest = null;
      return [];
    });
  return weeklyRequest;
};

/** Room fit of every group in the center, loaded once per page visit. */
export const useGroupRoomFits = (enabled = true) => {
  const [fits, setFits] = useState<Map<number, GroupRoomFit>>(new Map());
  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    weeklyRequest = null; // fresh numbers each time a page that needs them opens
    void loadWeeklyRooms().then((rooms) => { if (active) setFits(groupRoomFits(rooms)); });
    return () => { active = false; };
  }, [enabled]);
  return fits;
};
