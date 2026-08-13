import { useEffect, useMemo, useState } from 'react';
import { roomAPI } from '../api';
import type { RoomAssignment } from '../roomModel';
import type { RoomAvailabilityRow, RoomScheduleRow, RoomUtilizationRow, RoomWorkspaceFilters } from '../types';
import { deriveAvailability, deriveUtilization, enrichSchedule, filterSchedule } from '../workspaceModel';

const responseRows = <T,>(response: any, keys: string[]): T[] => {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
};

export const normalizeScheduleRows = (rows: any[]): RoomScheduleRow[] => rows.map((row) => ({
  ...row,
  room_id: Number(row.room_id ?? row.assignment_id ?? 0),
  room_number: row.room_number ?? row.room_name ?? row.name ?? '',
  time: row.time ?? row.start_time ?? null,
  end_time: row.end_time ?? null,
}));

export const normalizeAvailabilityRows = (rows: any[], fallback: RoomAvailabilityRow[]): RoomAvailabilityRow[] => rows.map((row) => {
  const roomNumber = String(row.roomNumber ?? row.room_number ?? row.room_name ?? row.name ?? '');
  const local = fallback.find((item) => item.roomNumber === roomNumber);
  return {
    // Slot management still targets the legacy assignment id until room_slots
    // is migrated to reference physical_rooms directly.
    roomId: Number(local?.roomId ?? row.roomId ?? row.room_id ?? 0),
    roomNumber,
    available: Boolean(row.available),
    nextLesson: row.nextLesson ?? row.next_lesson ?? local?.nextLesson ?? 'No lesson details',
    freeUntil: row.freeUntil ?? row.free_until ?? local?.freeUntil ?? 'End of day',
    assignment: local?.assignment,
  };
});

export const normalizeUtilizationRows = (rows: any[]): RoomUtilizationRow[] => rows.map((row) => ({
  roomNumber: String(row.roomNumber ?? row.room_number ?? row.name ?? ''),
  bookedMinutes: Number(row.bookedMinutes ?? row.booked_minutes ?? 0),
  availableMinutes: Number(row.availableMinutes ?? row.available_minutes ?? 0),
  utilization: Number(row.utilization ?? row.utilization_percent ?? 0),
}));

export const useRoomsWorkspace = (rooms: RoomAssignment[], classes: any[], teachers: any[], filters: RoomWorkspaceFilters) => {
  const fallbackSchedule = useMemo(() => filterSchedule(enrichSchedule(rooms, classes, teachers), filters), [rooms, classes, teachers, filters]);
  const fallbackAvailability = useMemo(() => deriveAvailability(rooms, fallbackSchedule, filters), [rooms, fallbackSchedule, filters]);
  const fallbackUtilization = useMemo(() => deriveUtilization(rooms), [rooms]);
  const [remoteSchedule, setRemoteSchedule] = useState<RoomScheduleRow[] | null>(null);
  const [remoteAvailability, setRemoteAvailability] = useState<RoomAvailabilityRow[] | null>(null);
  const [remoteUtilization, setRemoteUtilization] = useState<RoomUtilizationRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const params = {
      date: filters.date, start: filters.start, end: filters.end,
      teacher_id: filters.teacherId || undefined, subject_id: filters.subject || undefined,
      from: filters.date, to: filters.date,
    };
    const loadWorkspace = async () => {
      setLoading(true);
      const [scheduleResult, availabilityResult, utilizationResult] = await Promise.allSettled([
        roomAPI.getSchedule(params), roomAPI.getAvailability(params), roomAPI.getUtilization(params),
      ]);
      if (!active) return;
      if (scheduleResult.status === 'fulfilled') {
        const rows = normalizeScheduleRows(responseRows<any>(scheduleResult.value, ['schedule', 'rows']));
        setRemoteSchedule(rows.length ? filterSchedule(rows, filters) : null);
      }
      if (availabilityResult.status === 'fulfilled') {
        const rows = normalizeAvailabilityRows(responseRows<any>(availabilityResult.value, ['availability', 'rooms']), fallbackAvailability);
        setRemoteAvailability(rows.length ? rows : null);
      }
      if (utilizationResult.status === 'fulfilled') {
        const rows = normalizeUtilizationRows(responseRows<any>(utilizationResult.value, ['utilization', 'rooms']));
        setRemoteUtilization(rows.length ? rows : null);
      }
      setLoading(false);
    };
    void loadWorkspace();
    return () => { active = false; };
  }, [filters, fallbackSchedule, fallbackAvailability, fallbackUtilization]);

  return {
    schedule: remoteSchedule ?? fallbackSchedule,
    availability: remoteAvailability ?? fallbackAvailability,
    utilization: remoteUtilization ?? fallbackUtilization,
    loading,
  };
};
