const assignmentService = require('../services/assignment.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { classBelongsToTeacher, classInCenter } = require('../../../shared/tenantDb');

const getAllAssignments = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const rows = await assignmentService.getAllAssignments(centerId ?? undefined, teacherId);
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
    if (req.user?.userType === 'teacher') {
      const ok = await classBelongsToTeacher(req.body.class_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Class does not belong to this teacher.' });
    } else if (centerId) {
      const ok = await classInCenter(req.body.class_id, centerId);
      if (!ok) return res.status(400).json({ error: 'Class does not belong to this center.' });
    }
    const assignment = await assignmentService.createAssignment({ ...req.body, center_id: centerId ?? req.body.center_id });
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
