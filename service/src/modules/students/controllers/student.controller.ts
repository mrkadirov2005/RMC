const { generateToken } = require('../../../middleware/auth');
const studentService = require('../services/student.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { hasStudentListParams, parseStudentListQuery } = require('./studentListQuery');
const studentCoinsController = require('./studentCoins.controller');

const getAllStudents = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (hasStudentListParams(req.query)) {
      const result = await studentService.listStudentsPaginated(parseStudentListQuery(req.query), centerId ?? undefined, teacherId);
      return res.json(result);
    }
    const rows = await studentService.listStudents(centerId ?? undefined, teacherId);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message || String(error) });
  }
};

const getStudentById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await studentService.getStudent(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message || String(error) });
  }
};

const getDeletedStudents = async (req: any, res: any) => {
  try {
    const { centerId } = getScopedCenterId(req);
    const rows = await studentService.listDeletedStudents(centerId ?? undefined);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch deleted students', details: error.message || String(error) });
  }
};

const getClassStudentsWithTransfers = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.classId) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const rows = await studentService.listClassStudentsWithTransfers(Number(req.params.classId), centerId ?? undefined, teacherId);
    res.json(rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch class students', details: error.message || String(error) });
  }
};

const createStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const payload = { ...req.body, center_id: centerId };
    if (req.user?.userType === 'teacher') {
      // Teachers should not be able to freeze/unfreeze students.
      delete payload.is_frozen;
    }
    const row = await studentService.createStudent(payload);
    res.status(201).json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      // PostgreSQL unique_violation error code
      if (error.constraint === 'students_username_key' || error.message?.includes('username')) {
        return res.status(409).json({ error: 'Username already exists', message: 'A student with this username already exists. Please choose a different username.' });
      }
      if (error.constraint === 'students_enrollment_number_key' || error.message?.includes('enrollment')) {
        return res.status(409).json({ error: 'Enrollment number already exists', message: 'A student with this enrollment number already exists. Please choose a different number.' });
      }
    }
    
    res.status(500).json({ error: 'Failed to create student', message: error.message || String(error) });
  }
};

const updateStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const payload = { ...req.body };
    if (req.user?.userType === 'teacher') {
      // Teachers can edit student profile fields, but cannot freeze/unfreeze or reassign teacher ownership.
      delete payload.is_frozen;
      delete payload.teacher_id;
    }
    const row = await studentService.updateStudent(Number(req.params.id), payload, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message || String(error) });
  }
};

const deleteStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await studentService.deleteStudent(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted successfully', student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message || String(error) });
  }
};

const purgeStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await studentService.purgeStudent(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Soft-deleted student not found' });
    res.json({ message: 'Student permanently deleted', student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Student is still referenced by other records',
        message: 'Delete or reassign related records before permanently deleting this student.',
        details: error.detail,
      });
    }
    res.status(500).json({ error: 'Failed to permanently delete student', details: error.message || String(error) });
  }
};

const transferStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await studentService.transferStudent(
      Number(req.params.id),
      Number(req.body.target_class_id),
      centerId ?? undefined,
      teacherId
    );

    if (result?.error === 'not_found') return res.status(404).json({ error: 'Student not found' });
    if (result?.error === 'target_class_not_found') return res.status(404).json({ error: 'Target class not found' });
    if (result?.error === 'same_class') return res.status(400).json({ error: 'Student is already in this class' });

    res.status(201).json({
      message: 'Student transferred successfully',
      transferred_student: result.transferred,
      student: result.student,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to transfer student', details: error.message || String(error) });
  }
};

const studentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const result = await studentService.authenticate(username, password);
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Student account is not active' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    const { student } = result;
    const token = generateToken({
      id: student.student_id,
      email: student.email,
      userType: 'student',
      class_id: student.class_id,
      center_id: student.center_id,
      is_frozen: Boolean(student.is_frozen),
    });
    res.json({
      message: 'Login successful',
      token,
      student: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        class_id: student.class_id,
        center_id: student.center_id,
        is_frozen: Boolean(student.is_frozen),
      },
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || String(error) });
  }
};

const setStudentPassword = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'teacher' || req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const row = await studentService.setPasswordByAdmin(Number(req.params.id), username, password, centerId ?? undefined);
    if (!row) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student password set successfully', student: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || String(error) });
  }
};

const changeStudentPassword = async (req: any, res: any) => {
  try {
    const { old_password, new_password } = req.body;
    if (req.user?.userType === 'teacher') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const out = await studentService.changePassword(Number(req.params.id), old_password, new_password);
    if (!out.ok) {
      if (out.reason === 'not_found') return res.status(404).json({ error: 'Student not found' });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || String(error) });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getDeletedStudents,
  getClassStudentsWithTransfers,
  createStudent,
  updateStudent,
  deleteStudent,
  purgeStudent,
  transferStudent,
  studentLogin,
  setStudentPassword,
  changeStudentPassword,
  getStudentCoins: studentCoinsController.getStudentCoins,
  addStudentCoins: studentCoinsController.addStudentCoins,
  updateStudentCoinTransaction: studentCoinsController.updateStudentCoinTransaction,
  deleteStudentCoinTransaction: studentCoinsController.deleteStudentCoinTransaction,
};

export {};
