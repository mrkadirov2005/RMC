const teacherTaskRepository = require('../repositories/teacherTask.repository');

const getAllTeacherTasks = (options: {
  centerId?: number;
  teacherId?: number;
  limit?: number;
  offset?: number;
} = {}) => teacherTaskRepository.getAll(options);

const getTeacherTaskById = (id: number, centerId?: number, teacherId?: number) =>
  teacherTaskRepository.getById(id, centerId, teacherId);

const createTeacherTask = (payload: any) => teacherTaskRepository.create(payload);

const updateTeacherTask = (id: number, payload: any, centerId?: number) =>
  teacherTaskRepository.update(id, payload, centerId);

const deleteTeacherTask = (id: number, centerId?: number) => teacherTaskRepository.remove(id, centerId);

module.exports = {
  getAllTeacherTasks,
  getTeacherTaskById,
  createTeacherTask,
  updateTeacherTask,
  deleteTeacherTask,
};

export {};
