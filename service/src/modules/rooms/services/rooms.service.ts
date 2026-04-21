const roomsRepository = require('../repositories/rooms.repository');

const getAllRooms = async (centerId: number) => {
  return roomsRepository.findAll(centerId);
};

const getRoomById = async (id: number, centerId: number) => {
  return roomsRepository.findById(id, centerId);
};

const createRoom = async (data: any) => {
  const { center_id, room_number, class_id, day, time } = data;
  return roomsRepository.insert([center_id, room_number, class_id || null, day, time]);
};

const updateRoom = async (id: number, data: any, centerId: number) => {
  const { room_number, class_id, day, time } = data;
  return roomsRepository.update(id, [room_number, class_id || null, day, time], centerId);
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
