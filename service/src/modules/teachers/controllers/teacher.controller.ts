const { generateToken, generatePaymentToken } = require('../../../middleware/auth');
const teacherService = require('../services/teacher.service');
const teacherPaymentService = require('../services/teacher_payment.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const toPositiveInt = (value: unknown) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined;
};

const cleanString = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text || undefined;
};

const hasTeacherListParams = (query: Record<string, unknown>) =>
  ['q', 'search', 'status', 'page', 'limit'].some((key) => query[key] !== undefined && query[key] !== '');

const parseTeacherListQuery = (query: Record<string, unknown>) => ({
  q: cleanString(query.q || query.search),
  status: cleanString(query.status),
  page: toPositiveInt(query.page) || 1,
  limit: Math.min(100, toPositiveInt(query.limit) || 20),
});

const getMyProfile = async (req: any, res: any) => {
  try {
    const teacherId = Number(req.user?.id);
    if (!teacherId) {
      return res.status(400).json({ error: 'Unable to resolve teacher id.' });
    }
    const { centerId } = getScopedCenterId(req);
    const teacher = await teacherService.getTeacher(teacherId, centerId ?? undefined);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json({
      teacher_id: teacher.teacher_id,
      employee_id: teacher.employee_id,
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      email: teacher.email,
      phone: teacher.phone,
      status: teacher.status,
      center_id: teacher.center_id,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message || String(error) });
  }
};

const getAllTeachers = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    if (hasTeacherListParams(req.query)) {
      const result = await teacherService.listTeachersPaginated(parseTeacherListQuery(req.query), centerId ?? undefined);
      return res.json(result);
    }
    const rows = await teacherService.listTeachers(centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message || String(error) });
  }
};

const getTeacherById = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    const row = await teacherService.getTeacher(Number(req.params.id), centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Teacher not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher', details: error.message || String(error) });
  }
};

const createTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const out = await teacherService.createTeacher({ ...req.body, center_id: centerId });
    if (out.error === 'validation') {
      return res.status(400).json({ error: 'Validation failed', details: out.details });
    }
    if (out.error === 'username_taken') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create teacher', details: error.message || String(error) });
  }
};

const updateTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await teacherService.updateTeacher(Number(req.params.id), req.body, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Teacher not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message || String(error) });
  }
};

const deleteTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const force = String(req.query.force || req.body?.force || '').toLowerCase() === 'true';
    const result = await teacherService.deleteTeacher(Number(req.params.id), centerId ?? undefined, { force });
    if (result?.kind === 'not_found') return res.status(404).json({ error: 'Teacher not found', message: 'Teacher not found' });
    if (result?.kind === 'blocked') {
      return res.status(409).json({
        error: 'Teacher has attendance or grade records',
        message: 'Teacher cannot be deleted because attendance or grade records still reference this teacher.',
        reason: result.reason,
        dependencies: result.dependencies,
      });
    }
    if (result?.kind === 'has_dependencies') {
      return res.status(409).json({
        error: 'Teacher is assigned to active records',
        message: 'Teacher is assigned to classes, students, subjects, assignments, or sessions. Reassign them first or retry with force=true to unassign them.',
        dependencies: result.dependencies,
      });
    }
    res.json({ message: 'Teacher deleted successfully', teacher: result.row, unassigned: result.dependencies });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Teacher is still referenced by other records',
        message: 'Teacher is still referenced by other records. Reassign related records before deleting.',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to delete teacher', details: error.message || String(error) });
  }
};

const purgeTeacher = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const result = await teacherService.purgeTeacher(Number(req.params.id), centerId ?? undefined);
    if (result?.kind === 'not_found') {
      return res.status(404).json({ error: 'Soft-deleted teacher not found', message: 'Soft-deleted teacher not found' });
    }
    res.json({ message: 'Teacher permanently deleted', teacher: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Teacher is still referenced by other records',
        message: 'Reassign related records before permanently deleting this teacher.',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to permanently delete teacher', details: error.message || String(error) });
  }
};

const teacherLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await teacherService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Teacher account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { teacher } = result;
    const token = generateToken({
      id: teacher.teacher_id,
      email: teacher.email,
      userType: 'teacher',
      center_id: teacher.center_id,
    });
    res.json({
      message: 'Login successful',
      token,
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        center_id: teacher.center_id,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || String(error) });
  }
};

const setTeacherPaymentPassword = async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const teacher = await teacherService.getTeacher(Number(req.params.id), centerId ?? undefined);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });
    const row = await teacherPaymentService.setPaymentPassword(Number(req.params.id), password, req.user?.id);
    if (!row) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ message: 'Payment access password set successfully.' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set payment password', details: error.message || String(error) });
  }
};

const teacherPaymentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await teacherPaymentService.authenticatePaymentAccess(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Teacher account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { teacher } = result;
    const token = generatePaymentToken({
      id: teacher.teacher_id,
      email: teacher.email,
      userType: 'teacher',
      center_id: teacher.center_id,
      payment_access: true,
    });
    res.json({
      message: 'Payment access granted',
      token,
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        center_id: teacher.center_id,
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login for payment access', details: error.message || String(error) });
  }
};

const setTeacherPassword = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const row = await teacherService.setPasswordByAdmin(Number(req.params.id), username, password, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Teacher not found' });
    res.json({ message: 'Teacher password set successfully', teacher: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || String(error) });
  }
};

const changeTeacherPassword = async (req: any, res: any) => {
  try {
    if (req.user?.userType === 'teacher' && Number(req.user.id) !== Number(req.params.id)) {
      return res.status(403).json({ error: 'You can only change your own password.' });
    }
    const { old_password, new_password } = req.body;
    const out = await teacherService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: 'Teacher not found' });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || String(error) });
  }
};

module.exports = {
  getMyProfile,
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  purgeTeacher,
  teacherLogin,
  teacherPaymentLogin,
  setTeacherPaymentPassword,
  setTeacherPassword,
  changeTeacherPassword,
};

export {};
