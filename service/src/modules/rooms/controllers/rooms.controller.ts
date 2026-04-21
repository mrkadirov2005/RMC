const roomsService = require('../services/rooms.service');

const getAllRooms = async (req: any, res: any) => {
  try {
    const centerId = req.query.center_id || req.user.center_id;
    if (!centerId) return res.status(400).json({ error: 'Center ID is required' });
    const rooms = await roomsService.getAllRooms(centerId);
    res.json(rooms);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const getRoomById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = req.query.center_id || req.user.center_id;
    const room = await roomsService.getRoomById(id, centerId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const createRoom = async (req: any, res: any) => {
  try {
    const centerId = req.body.center_id || req.user.center_id;
    const room = await roomsService.createRoom({ ...req.body, center_id: centerId });
    res.status(201).json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const updateRoom = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = req.body.center_id || req.user.center_id;
    const room = await roomsService.updateRoom(id, req.body, centerId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRoom = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const centerId = req.query.center_id || req.user.center_id;
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
