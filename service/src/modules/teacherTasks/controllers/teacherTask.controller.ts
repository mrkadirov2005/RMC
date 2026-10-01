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
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
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
    res.status(500).json({ error: "O'qituvchi vazifalarini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getTeacherTaskById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
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
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchi vazifasini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createTeacherTask = async (req: any, res: any) => {
  try {
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: 'Vazifalarni faqat markaz egasi tayinlay oladi.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    const assigneeType = req.body.assignee_type;
    if (assigneeType !== 'teacher' && assigneeType !== 'admin') {
      return res.status(400).json({ error: "assignee_type qiymati \"teacher\" yoki \"admin\" bo'lishi kerak." });
    }
    if (!req.body.task_title || !String(req.body.task_title).trim()) {
      return res.status(400).json({ error: "task_title ko'rsatilishi shart." });
    }
    if (!teacherTaskService.isValidDeadline(req.body.deadline)) {
      return res.status(400).json({ error: "deadline to'g'ri sana bo'lishi kerak." });
    }

    let teacherId: number | undefined;
    let adminId: number | undefined;

    if (assigneeType === 'teacher') {
      teacherId = Number(req.body.teacher_id);
      if (!teacherId) {
        return res.status(400).json({ error: "teacher_id ko'rsatilishi shart." });
      }
      if (effectiveCenterId) {
        const ok = await teacherInCenter(teacherId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: "O'qituvchi bu markazga tegishli emas." });
      }
    } else {
      adminId = Number(req.body.admin_id);
      if (!adminId) {
        return res.status(400).json({ error: "admin_id ko'rsatilishi shart." });
      }
      if (effectiveCenterId) {
        const ok = await superuserInCenter(adminId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: 'Admin bu markazga tegishli emas.' });
      }
      const admin = await superuserService.getSuperuser(adminId, effectiveCenterId);
      if (admin && String(admin.role || '').toLowerCase() === 'owner') {
        return res.status(400).json({ error: "Vazifani markaz egasiga tayinlab bo'lmaydi." });
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
    res.status(500).json({ error: "O'qituvchi vazifasini yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateTeacherTask = async (req: any, res: any) => {
  try {
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: 'Vazifalarni faqat markaz egasi yangilay oladi.' });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    if (!teacherTaskService.isValidDeadline(req.body.deadline)) {
      return res.status(400).json({ error: "deadline to'g'ri sana bo'lishi kerak." });
    }

    const payload: any = {
      task_title: req.body.task_title,
      task_definition: req.body.task_definition,
      deadline: req.body.deadline,
    };

    if (req.body.assignee_type !== undefined) {
      const assigneeType = req.body.assignee_type;
      if (assigneeType !== 'teacher' && assigneeType !== 'admin') {
        return res.status(400).json({ error: "assignee_type qiymati \"teacher\" yoki \"admin\" bo'lishi kerak." });
      }
      if (assigneeType === 'teacher') {
        const teacherId = Number(req.body.teacher_id);
        if (!teacherId) {
          return res.status(400).json({ error: "teacher_id ko'rsatilishi shart." });
        }
        if (effectiveCenterId) {
          const ok = await teacherInCenter(teacherId, effectiveCenterId);
          if (!ok) return res.status(400).json({ error: "O'qituvchi bu markazga tegishli emas." });
        }
        payload.assignee_type = assigneeType;
        payload.teacher_id = teacherId;
        payload.admin_id = null;
      } else {
        const adminId = Number(req.body.admin_id);
        if (!adminId) {
          return res.status(400).json({ error: "admin_id ko'rsatilishi shart." });
        }
        if (effectiveCenterId) {
          const ok = await superuserInCenter(adminId, effectiveCenterId);
          if (!ok) return res.status(400).json({ error: 'Admin bu markazga tegishli emas.' });
        }
        const admin = await superuserService.getSuperuser(adminId, effectiveCenterId);
        if (admin && String(admin.role || '').toLowerCase() === 'owner') {
          return res.status(400).json({ error: "Vazifani markaz egasiga tayinlab bo'lmaydi." });
        }
        payload.assignee_type = assigneeType;
        payload.admin_id = adminId;
        payload.teacher_id = null;
      }
    }

    const task = await teacherTaskService.updateTeacherTask(Number(req.params.id), payload, centerId ?? undefined);
    if (!task) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json(task);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchi vazifasini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const updateTeacherTaskStatus = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }

    const action = req.body.action;
    const transition = STATUS_TRANSITIONS[action];
    if (!transition) {
      return res.status(400).json({ error: "action qiymati \"accept\", \"reject\" yoki \"done\" dan biri bo'lishi kerak." });
    }
    if (action === 'reject' && (!req.body.reason || !String(req.body.reason).trim())) {
      return res.status(400).json({ error: "Vazifani rad etish uchun sabab ko'rsatilishi shart." });
    }

    const isTeacher = req.user?.userType === 'teacher';
    const isAdmin = isCenterAdmin(req.user);
    if (!isTeacher && !isAdmin) {
      return res.status(403).json({ error: "Vazifa holatini faqat biriktirilgan o'qituvchi yoki admin yangilay oladi." });
    }

    const taskId = Number(req.params.id);
    const existing = await teacherTaskService.getTeacherTaskById(
      taskId,
      centerId ?? undefined,
      isTeacher ? Number(req.user.id) : undefined,
      isAdmin ? Number(req.user.id) : undefined
    );
    if (!existing) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }

    const belongsToCaller = isTeacher
      ? existing.assignee_type === 'teacher' && Number(existing.teacher_id) === Number(req.user.id)
      : existing.assignee_type === 'admin' && Number(existing.admin_id) === Number(req.user.id);
    if (!belongsToCaller) {
      return res.status(403).json({ error: 'Siz bu vazifaga biriktirilmagansiz.' });
    }

    if (existing.status !== transition.from) {
      return res.status(409).json({
        error: `Vazifani "${action}" qilib bo'lmaydi: hozirgi holati "${existing.status}", kutilgan holat "${transition.from}".`,
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
    res.status(500).json({ error: "O'qituvchi vazifasi holatini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const getTeacherTaskStats = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
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
    res.status(500).json({ error: "O'qituvchi vazifalari statistikasini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteTeacherTask = async (req: any, res: any) => {
  try {
    if (!isGlobalUser(req.user)) {
      return res.status(403).json({ error: "Vazifalarni faqat markaz egasi o'chira oladi." });
    }
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const task = await teacherTaskService.deleteTeacherTask(Number(req.params.id), centerId ?? undefined);
    if (!task) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json({ message: "Vazifa muvaffaqiyatli o'chirildi", task });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchi vazifasini o'chirib bo'lmadi", details: error.message || String(error) });
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
