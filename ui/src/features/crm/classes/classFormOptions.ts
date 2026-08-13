export const buildRoomNumberOptions = (rooms: Array<{ name?: unknown; room_name?: unknown; room_number?: unknown }>, currentRoom?: unknown) => {
  const values = new Set(rooms.map((room) => String(room.name || room.room_name || room.room_number || '').trim()).filter(Boolean));
  const current = String(currentRoom || '').trim();
  if (current) values.add(current);

  const numberIn = (value: string) => Number(value.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
  return [...values].sort((a, b) => numberIn(a) - numberIn(b) || a.localeCompare(b, undefined, { numeric: true }));
};

export const mergeRoomInventories = (
  physicalRooms: Array<{ name?: unknown; room_name?: unknown; room_number?: unknown }>,
  roomAssignments: Array<{ name?: unknown; room_name?: unknown; room_number?: unknown }>,
  currentRoom?: unknown
) => buildRoomNumberOptions([...physicalRooms, ...roomAssignments], currentRoom);
