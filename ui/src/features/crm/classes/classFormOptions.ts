export const buildRoomNumberOptions = (rooms: Array<{ room_number?: unknown }>, currentRoom?: unknown) => {
  const values = new Set(rooms.map((room) => String(room.room_number || '').trim()).filter(Boolean));
  const current = String(currentRoom || '').trim();
  if (current) values.add(current);

  const numberIn = (value: string) => Number(value.match(/\d+/)?.[0] || Number.MAX_SAFE_INTEGER);
  return [...values].sort((a, b) => numberIn(a) - numberIn(b) || a.localeCompare(b, undefined, { numeric: true }));
};
