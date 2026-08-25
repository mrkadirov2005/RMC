const teacherTaskRepository = require('../repositories/teacherTask.repository');

const getAllTeacherTasks = (options: {
  centerId?: number;
  teacherId?: number;
  adminId?: number;
  status?: string;
  limit?: number;
  offset?: number;
} = {}) => teacherTaskRepository.getAll(options);

const getTeacherTaskById = (id: number, centerId?: number, teacherId?: number, adminId?: number) =>
  teacherTaskRepository.getById(id, centerId, teacherId, adminId);

const createTeacherTask = (payload: any) => teacherTaskRepository.create(payload);

const updateTeacherTask = (id: number, payload: any, centerId?: number) =>
  teacherTaskRepository.update(id, payload, centerId);

const updateTeacherTaskStatus = (
  id: number,
  patch: { status: string; statusNote?: string | null },
  scope: { centerId?: number } = {}
) => teacherTaskRepository.updateStatus(id, patch, scope);

const deleteTeacherTask = (id: number, centerId?: number) => teacherTaskRepository.remove(id, centerId);

const getTeacherTaskStats = async (
  options: { centerId?: number; teacherId?: number; adminId?: number } = {}
) => {
  const rows = await teacherTaskRepository.getStats(options);
  const counts: { pending: number; accepted: number; rejected: number; done: number; [key: string]: number } = {
    pending: 0,
    accepted: 0,
    rejected: 0,
    done: 0,
  };
  rows.forEach((r: any) => {
    if (r.status in counts) counts[r.status] = Number(r.count) || 0;
  });
  const total = counts.pending + counts.accepted + counts.rejected + counts.done;
  const efficiency = total > 0 ? Math.round((counts.done / total) * 1000) / 10 : 0;
  return { ...counts, total, efficiency };
};

module.exports = {
  getAllTeacherTasks,
  getTeacherTaskById,
  createTeacherTask,
  updateTeacherTask,
  updateTeacherTaskStatus,
  deleteTeacherTask,
  getTeacherTaskStats,
};

export {};
