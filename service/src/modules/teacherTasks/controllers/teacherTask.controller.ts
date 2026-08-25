const teacherTaskService = require('../services/teacherTask.service');
const { getScopedCenterId, isGlobalUser, isCenterAdmin } = require('../../../shared/tenant');
const { teacherInCenter, superuserInCenter } = require('../../../shared/tenantDb');
const superuserService = require('../../superusers/services/superuser.service');

const STATUS_TRANSITIONS: Record<string, { from: string; to: string }> = {
  accept: { from: 'pending', to: 'accepted' },
  reject: { from: 'pending', to: 'rejected' },
  done: { from: 'accepted', to: 'done' },
};

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
    const isAdmin = isCenterAdmin(req.user);
    const teacherId = isTeacher
      ? Number(req.user?.id)
      : (!isAdmin && req.query.teacher_id ? Number(req.query.teacher_id) : undefined);
    const adminId = isAdmin
      ? Number(req.user?.id)
      : (!isTeacher && !isAdmin && req.query.admin_id ? Number(req.query.admin_id) : undefined);
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const requestedPage = Number(req.query.page || 1);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
    const rows = await teacherTaskService.getAllTeacherTasks({
      centerId: centerId ?? undefined,
      teacherId,
      adminId,
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
    const isAdmin = isCenterAdmin(req.user);
    const teacherId = isTeacher
      ? Number(req.user?.id)
      : (!isAdmin && req.query.teacher_id ? Number(req.query.teacher_id) : undefined);
    const adminId = isAdmin
      ? Number(req.user?.id)
      : (!isTeacher && !isAdmin && req.query.admin_id ? Number(req.query.admin_id) : undefined);
    const task = await teacherTaskService.getTeacherTaskById(Number(req.params.id), centerId ?? undefined, teacherId, adminId);
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
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: 'Only the center owner can assign tasks.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    const assigneeType = req.body.assignee_type;
    if (assigneeType !== 'teacher' && assigneeType !== 'admin') {
      return res.status(400).json({ error: 'assignee_type must be either "teacher" or "admin".' });
    }
    if (!req.body.task_title || !String(req.body.task_title).trim()) {
      return res.status(400).json({ error: 'task_title is required.' });
    }

    let teacherId: number | undefined;
    let adminId: number | undefined;

    if (assigneeType === 'teacher') {
      teacherId = Number(req.body.teacher_id);
      if (!teacherId) {
        return res.status(400).json({ error: 'teacher_id is required.' });
      }
      if (effectiveCenterId) {
        const ok = await teacherInCenter(teacherId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: 'Teacher does not belong to this center.' });
      }
    } else {
      adminId = Number(req.body.admin_id);
      if (!adminId) {
        return res.status(400).json({ error: 'admin_id is required.' });
      }
      if (effectiveCenterId) {
        const ok = await superuserInCenter(adminId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: 'Admin does not belong to this center.' });
      }
      const admin = await superuserService.getSuperuser(adminId, effectiveCenterId);
      if (admin && String(admin.role || '').toLowerCase() === 'owner') {
        return res.status(400).json({ error: 'Cannot assign a task to the center owner.' });
      }
    }

    const task = await teacherTaskService.createTeacherTask({
      ...req.body,
      assignee_type: assigneeType,
      teacher_id: teacherId,
      admin_id: adminId,
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
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: 'Only the center owner can update tasks.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    const payload: any = {
      task_title: req.body.task_title,
      task_definition: req.body.task_definition,
      deadline: req.body.deadline,
    };

    if (req.body.assignee_type !== undefined) {
      const assigneeType = req.body.assignee_type;
      if (assigneeType !== 'teacher' && assigneeType !== 'admin') {
        return res.status(400).json({ error: 'assignee_type must be either "teacher" or "admin".' });
      }
      if (assigneeType === 'teacher') {
        const teacherId = Number(req.body.teacher_id);
        if (!teacherId) {
          return res.status(400).json({ error: 'teacher_id is required.' });
        }
        if (effectiveCenterId) {
          const ok = await teacherInCenter(teacherId, effectiveCenterId);
          if (!ok) return res.status(400).json({ error: 'Teacher does not belong to this center.' });
        }
        payload.assignee_type = assigneeType;
        payload.teacher_id = teacherId;
        payload.admin_id = null;
      } else {
        const adminId = Number(req.body.admin_id);
        if (!adminId) {
          return res.status(400).json({ error: 'admin_id is required.' });
        }
        if (effectiveCenterId) {
          const ok = await superuserInCenter(adminId, effectiveCenterId);
          if (!ok) return res.status(400).json({ error: 'Admin does not belong to this center.' });
        }
        const admin = await superuserService.getSuperuser(adminId, effectiveCenterId);
        if (admin && String(admin.role || '').toLowerCase() === 'owner') {
          return res.status(400).json({ error: 'Cannot assign a task to the center owner.' });
        }
        payload.assignee_type = assigneeType;
        payload.admin_id = adminId;
        payload.teacher_id = null;
      }
    }

    const task = await teacherTaskService.updateTeacherTask(Number(req.params.id), payload, centerId ?? undefined);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher task', details: error.message || String(error) });
  }
};

const updateTeacherTaskStatus = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }

    const action = req.body.action;
    const transition = STATUS_TRANSITIONS[action];
    if (!transition) {
      return res.status(400).json({ error: 'action must be one of "accept", "reject", or "done".' });
    }
    if (action === 'reject' && (!req.body.reason || !String(req.body.reason).trim())) {
      return res.status(400).json({ error: 'A reason is required to reject a task.' });
    }

    const isTeacher = req.user?.userType === 'teacher';
    const isAdmin = isCenterAdmin(req.user);
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ error: 'Only the assigned teacher or admin can update task status.' });
    }

    const taskId = Number(req.params.id);
    const existing = await teacherTaskService.getTeacherTaskById(
      taskId,
      centerId ?? undefined,
      isTeacher ? Number(req.user.id) : undefined,
      isAdmin ? Number(req.user.id) : undefined
    );
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const belongsToCaller = isTeacher
      ? existing.assignee_type === 'teacher' && Number(existing.teacher_id) === Number(req.user.id)
      : existing.assignee_type === 'admin' && Number(existing.admin_id) === Number(req.user.id);
    if (!belongsToCaller) {
      return res.status(403).json({ error: 'You are not the assignee of this task.' });
    }

    if (existing.status !== transition.from) {
      return res.status(409).json({
        error: `Cannot ${action} a task that is currently "${existing.status}". Expected status "${transition.from}".`,
      });
    }

    const statusNote =
      action === 'reject'
        ? String(req.body.reason).trim()
        : req.body.note
          ? String(req.body.note).trim()
          : null;

    const task = await teacherTaskService.updateTeacherTaskStatus(
      taskId,
      { status: transition.to, statusNote },
      { centerId: centerId ?? undefined }
    );
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher task status', details: error.message || String(error) });
  }
};

const getTeacherTaskStats = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const isTeacher = req.user?.userType === 'teacher';
    const isAdmin = isCenterAdmin(req.user);
    const teacherId = isTeacher
      ? Number(req.user?.id)
      : (!isAdmin && req.query.teacher_id ? Number(req.query.teacher_id) : undefined);
    const adminId = isAdmin
      ? Number(req.user?.id)
      : (!isTeacher && !isAdmin && req.query.admin_id ? Number(req.query.admin_id) : undefined);
    const stats = await teacherTaskService.getTeacherTaskStats({
      centerId: centerId ?? undefined,
      teacherId,
      adminId,
    });
    res.json(stats);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher task stats', details: error.message || String(error) });
  }
};

const deleteTeacherTask = async (req: any, res: any) => {
  try {
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: 'Only the center owner can delete tasks.' });
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
  updateTeacherTaskStatus,
  getTeacherTaskStats,
  deleteTeacherTask,
};

export {};
