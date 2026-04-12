const classService = require('../services/class.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllClasses = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json(await classService.listClasses(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message || String(error) });
  }
};

const getClassById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await classService.getClass(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Class not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch class', details: error.message || String(error) });
  }
};

const createClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await classService.createClass(req.body, centerId ?? undefined);
    if (out && 'error' in out && out.error === 'bad_teacher') {
      return res.status(400).json({ error: 'Teacher not found. Please provide a valid teacher_id' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create class', details: error.message || String(error) });
  }
};

const updateClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await classService.updateClass(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Class not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update class', details: error.message || String(error) });
  }
};

const deleteClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await classService.deleteClass(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Class not found' });
    res.json({ message: 'Class deleted successfully', class: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete class', details: error.message || String(error) });
  }
};

module.exports = { getAllClasses, getClassById, createClass, updateClass, deleteClass };

export {};
