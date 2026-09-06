const roomsService = require('../services/rooms.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const resolveCenter = (req: any, res: any): number | null => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Center scope required.' });
    return null;
  }
  if (!centerId && isGlobal) {
    res.status(400).json({ error: 'center_id is required for superuser actions.' });
    return null;
  }
  return centerId as number;
};

const getAllRooms = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const rooms = await roomsService.getAllRooms(centerId);
    res.json(rooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getRoomById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const room = await roomsService.getRoomById(id, centerId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createRoom = async (req: any, res: any) => {
  try {
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const room = await roomsService.createRoom({ ...req.body, center_id: centerId });
    if (room?.error === 'bad_time_window') {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }
    if (room?.error === 'room_unavailable') {
      return res.status(409).json({ error: 'Room is not available for this time.', conflict: room.conflict });
    }
    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateRoom = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const room = await roomsService.updateRoom(id, req.body, centerId);
    if (room?.error === 'bad_time_window') {
      return res.status(400).json({ error: 'End time must be after start time.' });
    }
    if (room?.error === 'room_unavailable') {
      return res.status(409).json({ error: 'Room is not available for this time.', conflict: room.conflict });
    }
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRoom = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = resolveCenter(req, res);
    if (centerId == null) return;
    const room = await roomsService.deleteRoom(id, centerId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ message: 'Room deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};

export {};
