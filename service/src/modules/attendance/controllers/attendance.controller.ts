const attendanceService = require('../services/attendance.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    res.json(await attendanceService.list(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

const getAttendanceById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await attendanceService.getById(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Attendance not found' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message || String(error) });
  }
};

const createAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(req.body.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    const out = await attendanceService.create(req.body, centerId ?? req.body.center_id);
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student does not belong to this center.' });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create attendance', details: error.message || String(error) });
  }
};

const updateAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await attendanceService.update(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Attendance not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message || String(error) });
  }
};

const getAttendanceByStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.json(await attendanceService.byStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

const getAttendanceByClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    res.json(await attendanceService.byClass(Number(req.params.classId), centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

const deleteAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await attendanceService.remove(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Attendance record not found' });
    res.json({ message: 'Attendance record deleted successfully', attendance: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete attendance', details: error.message || String(error) });
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  getAttendanceByStudent,
  getAttendanceByClass,
  deleteAttendance,
};

export {};
