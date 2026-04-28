const { generateToken } = require('../../../middleware/auth');
const parentService = require('../services/parent.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllParents = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    res.json(await parentService.listParents(centerId ?? undefined));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch parents', details: error.message || String(error) });
  }
};

const getParentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await parentService.getParent(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Parent not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch parent', details: error.message || String(error) });
  }
};

const createParent = async (req: any, res: any) => {
  try {
    const out = await parentService.createParent(req.body);
    res.status(201).json({ message: 'Parent created', parent: (out as any).row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create parent', details: error.message || String(error) });
  }
};

const updateParent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await parentService.updateParent(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Parent not found' });
    res.json({ message: 'Parent updated', parent: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update parent', details: error.message || String(error) });
  }
};

const deleteParent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await parentService.deleteParent(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Parent not found' });
    res.json({ message: 'Parent deleted', parent: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete parent', details: error.message || String(error) });
  }
};

const assignStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const out = await parentService.assignStudent(req.body, centerId ?? undefined);
    if (out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student does not belong to this center.' });
    }
    res.status(201).json({ message: 'Student assigned to parent' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to assign student', details: error.message || String(error) });
  }
};

const parentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await parentService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Parent account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { parent } = result;
    const token = generateToken({
      id: parent.parent_id,
      email: parent.email,
      userType: 'parent',
    });
    res.json({
      message: 'Login successful',
      token,
      parent: {
        parent_id: parent.parent_id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        email: parent.email,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || String(error) });
  }
};

const getMyStudents = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudents(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch parent students', details: error.message || String(error) });
  }
};

const getMyStudentPayments = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentPayments(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || String(error) });
  }
};

const getMyStudentAttendance = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentAttendance(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message || String(error) });
  }
};

const getMyStudentGrades = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentGrades(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades', details: error.message || String(error) });
  }
};

const getMyStudentTests = async (req: any, res: any) => {
  try {
    const parentId = req.user?.id;
    res.json(await parentService.getMyStudentTests(parentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch test submissions', details: error.message || String(error) });
  }
};

module.exports = {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  assignStudent,
  parentLogin,
  getMyStudents,
  getMyStudentPayments,
  getMyStudentAttendance,
  getMyStudentGrades,
  getMyStudentTests,
};

export {};
