const assignmentRepository = require('../repositories/assignment.repository');

const getAllAssignments = (centerId?: number, teacherId?: number) => assignmentRepository.getAll(centerId, teacherId);

const getAssignmentById = (id: number, centerId?: number, teacherId?: number) =>
  assignmentRepository.getById(id, centerId, teacherId);

const createAssignment = (payload: any) => assignmentRepository.create(payload);

const updateAssignment = (id: number, payload: any, centerId?: number, teacherId?: number) =>
  assignmentRepository.update(id, payload, centerId, teacherId);

const deleteAssignment = (id: number, centerId?: number, teacherId?: number) => assignmentRepository.remove(id, centerId, teacherId);

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};

export {};
