const teacherTaskService = require('../services/teacherTask.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { teacherInCenter } = require('../../../shared/tenantDb');

const getAllTeacherTasks = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const isTeacher = req.user?.userType === 'teacher';
    const teacherId = isTeacher ? Number(req.user?.id) : (req.query.teacher_id ? Number(req.query.teacher_id) : undefined);
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const requestedPage = Number(req.query.page || 1);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
    const rows = await teacherTaskService.getAllTeacherTasks({
      centerId: centerId ?? undefined,
      teacherId,
      limit,
      offset: (page - 1) * limit,
    });
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher tasks', details: error.message || String(error) });
  }
};

const getTeacherTaskById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const isTeacher = req.user?.userType === 'teacher';
    const teacherId = isTeacher ? Number(req.user?.id) : undefined;
    const task = await teacherTaskService.getTeacherTaskById(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher task', details: error.message || String(error) });
  }
};

const createTeacherTask = async (req: any, res: any) => {
  try {
    if (req.user?.userType !== 'superuser') {
      return res.status(403).json({ error: 'Only owners or admins can assign tasks.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;
    const teacherId = Number(req.body.teacher_id);
    if (!teacherId) {
      return res.status(400).json({ error: 'teacher_id is required.' });
    }
    if (!req.body.task_title || !String(req.body.task_title).trim()) {
      return res.status(400).json({ error: 'task_title is required.' });
    }
    if (effectiveCenterId) {
      const ok = await teacherInCenter(teacherId, effectiveCenterId);
      if (!ok) return res.status(400).json({ error: 'Teacher does not belong to this center.' });
    }
    const task = await teacherTaskService.createTeacherTask({
      ...req.body,
      teacher_id: teacherId,
      center_id: effectiveCenterId,
      created_by: req.user?.id ? Number(req.user.id) : null,
    });
    res.status(201).json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create teacher task', details: error.message || String(error) });
  }
};

const updateTeacherTask = async (req: any, res: any) => {
  try {
    if (req.user?.userType !== 'superuser') {
      return res.status(403).json({ error: 'Only owners or admins can update tasks.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const task = await teacherTaskService.updateTeacherTask(Number(req.params.id), req.body, centerId ?? undefined);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher task', details: error.message || String(error) });
  }
};

const deleteTeacherTask = async (req: any, res: any) => {
  try {
    if (req.user?.userType !== 'superuser') {
      return res.status(403).json({ error: 'Only owners or admins can delete tasks.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const task = await teacherTaskService.deleteTeacherTask(Number(req.params.id), centerId ?? undefined);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully', task });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete teacher task', details: error.message || String(error) });
  }
};

module.exports = {
  getAllTeacherTasks,
  getTeacherTaskById,
  createTeacherTask,
  updateTeacherTask,
  deleteTeacherTask,
};

export {};
