const assignmentService = require('../services/assignment.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { classBelongsToTeacher, classInCenter } = require('../../../shared/tenantDb');

const getAllAssignments = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const requestedLimit = Number(req.query.limit || 100);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 200) : 100;
    const requestedPage = Number(req.query.page || 1);
    const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
    const classId = req.query.class_id ? Number(req.query.class_id) : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const rows = await assignmentService.getAllAssignments({
      centerId: centerId ?? undefined,
      teacherId,
      classId,
      limit,
      offset: (page - 1) * limit,
    });
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Vazifalarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getAssignmentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const assignment = await assignmentService.getAssignmentById(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Vazifani yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const classId = req.body.class_id;
    const effectiveCenterId = centerId ?? req.body.center_id;
    if (classId !== undefined && classId !== null && classId !== '') {
      if (req.user?.userType === 'teacher') {
        const ok = await classBelongsToTeacher(classId, req.user?.id);
        if (!ok) return res.status(403).json({ error: "Guruh bu o'qituvchiga tegishli emas." });
      } else if (effectiveCenterId) {
        const ok = await classInCenter(classId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: 'Guruh bu markazga tegishli emas.' });
      }
    }
    const assignment = await assignmentService.createAssignment({ ...req.body, center_id: effectiveCenterId });
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Vazifani yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const assignment = await assignmentService.updateAssignment(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Vazifani yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const assignment = await assignmentService.deleteAssignment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }
    res.json({ message: "Vazifa muvaffaqiyatli o'chirildi", assignment });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Vazifani o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
};

export {};
