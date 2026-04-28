const { generateToken } = require('../../../middleware/auth');
const studentService = require('../services/student.service');
const { getScopedCenterId } = require('../../../shared/tenant');

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

const getStudentCoins = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const summary = await studentService.getCoinSummary(studentId, centerId ?? undefined, teacherId);
    if (!summary) return res.status(404).json({ error: 'Student not found' });
    res.json(summary);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch coins', details: error.message || String(error) });
  }
};

const addStudentCoins = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const rawAmount = Number(req.body?.amount);

    const direction = String(req.body?.direction || '').toLowerCase();
    const delta = direction === 'subtract' ? -Math.abs(rawAmount) : rawAmount;
    const reason = req.body?.reason ? String(req.body.reason) : null;

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.addCoins(studentId, delta, reason, req.user?.id ?? null, req.user?.userType ?? null);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found') {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update coins', details: error.message || String(error) });
  }
};

const updateStudentCoinTransaction = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    const transactionId = Number(req.params.transactionId);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const rawAmount = Number(req.body?.amount);
    const direction = String(req.body?.direction || '').toLowerCase();
    const delta = direction === 'subtract' ? -Math.abs(rawAmount) : rawAmount;
    const reason = req.body?.reason ? String(req.body.reason) : null;

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.updateCoinTransaction(studentId, transactionId, delta, reason);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found' || out.error === 'tx_not_found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update coins', details: error.message || String(error) });
  }
};

const deleteStudentCoinTransaction = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = Number(req.params.id);
    const transactionId = Number(req.params.transactionId);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const scopedStudent = await studentService.getStudent(studentId, centerId ?? undefined, teacherId);
    if (!scopedStudent) return res.status(404).json({ error: 'Student not found' });

    const out = await studentService.deleteCoinTransaction(studentId, transactionId);
    if (out.error === 'insufficient') {
      return res.status(400).json({ error: 'Insufficient coins for this operation.' });
    }
    if (out.error === 'not_found' || out.error === 'tx_not_found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete coins', details: error.message || String(error) });
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  studentLogin,
  setStudentPassword,
  changeStudentPassword,
  getStudentCoins,
  addStudentCoins,
  updateStudentCoinTransaction,
  deleteStudentCoinTransaction,
};

export {};
