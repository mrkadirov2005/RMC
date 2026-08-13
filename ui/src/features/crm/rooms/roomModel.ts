export type RoomAssignment = {
  room_id: number;
  room_number?: string;
  class_id?: number | null;
  class_name?: string | null;
  day?: string | null;
  time?: string | null;
  end_time?: string | null;
};

export const normalizeRoomAssignment = (row: any): RoomAssignment => ({
  ...row,
  room_id: Number(row?.room_id ?? row?.roomId ?? row?.id ?? 0),
  room_number: row?.room_number ?? row?.roomNumber ?? '',
  class_id: row?.class_id ?? row?.classId ?? null,
  class_name: row?.class_name ?? row?.className ?? null,
  day: row?.day ?? null,
  time: row?.time ?? null,
  end_time: row?.end_time ?? row?.endTime ?? null,
});

export const normalizeRoomAssignments = (rows: any[]): RoomAssignment[] =>
  rows.map(normalizeRoomAssignment).filter((row) => row.room_id > 0 && String(row.room_number || '').trim());

export const isClassAssignment = (room: RoomAssignment) => Number(room.class_id || 0) > 0;

export const filterClassesByTeacher = <T extends { teacher_id?: number | string | null }>(classes: T[], teacherId: string) =>
  teacherId ? classes.filter((item) => Number(item.teacher_id || 0) === Number(teacherId)) : [];

export const buildRoomGroups = (rows: RoomAssignment[]) => {
  const grouped = new Map<string, RoomAssignment[]>();
  rows.forEach((row) => {
    const roomNumber = String(row.room_number || '').trim();
    if (!roomNumber) return;
    grouped.set(roomNumber, [...(grouped.get(roomNumber) || []), row]);
  });

  return Array.from(grouped.entries())
    .map(([roomNumber, allRows]) => {
      const assignments = allRows
        .filter(isClassAssignment)
        .sort((a, b) => `${a.day || ''}${a.time || ''}`.localeCompare(`${b.day || ''}${b.time || ''}`));
      return {
        roomNumber,
        allRows,
        assignments,
        classCount: new Set(assignments.map((row) => Number(row.class_id))).size,
        assignmentCount: assignments.length,
        dayCount: new Set(assignments.map((row) => String(row.day || '').trim()).filter(Boolean)).size,
      };
    })
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
};

export const buildAssignedClassGroups = (assignments: RoomAssignment[]) => {
  const grouped = new Map<number, { id: number; name: string; assignments: RoomAssignment[] }>();
  assignments.forEach((assignment) => {
    const id = Number(assignment.class_id || 0);
    if (!id) return;
    const existing = grouped.get(id) || {
      id,
      name: String(assignment.class_name || `Class #${id}`),
      assignments: [],
    };
    existing.assignments.push(assignment);
    grouped.set(id, existing);
  });
  return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
};
