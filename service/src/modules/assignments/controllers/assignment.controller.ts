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
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
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
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message || String(error) });
  }
};

const getAssignmentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const assignment = await assignmentService.getAssignmentById(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment', details: error.message || String(error) });
  }
};

const createAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const classId = req.body.class_id;
    const effectiveCenterId = centerId ?? req.body.center_id;
    if (classId !== undefined && classId !== null && classId !== '') {
      if (req.user?.userType === 'teacher') {
        const ok = await classBelongsToTeacher(classId, req.user?.id);
        if (!ok) return res.status(403).json({ error: 'Class does not belong to this teacher.' });
      } else if (effectiveCenterId) {
        const ok = await classInCenter(classId, effectiveCenterId);
        if (!ok) return res.status(400).json({ error: 'Class does not belong to this center.' });
      }
    }
    const assignment = await assignmentService.createAssignment({ ...req.body, center_id: effectiveCenterId });
    res.status(201).json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create assignment', details: error.message || String(error) });
  }
};

const updateAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const assignment = await assignmentService.updateAssignment(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update assignment', details: error.message || String(error) });
  }
};

const deleteAssignment = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const assignment = await assignmentService.deleteAssignment(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted successfully', assignment });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete assignment', details: error.message || String(error) });
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
