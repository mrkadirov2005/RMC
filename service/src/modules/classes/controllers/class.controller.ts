const classService = require('../services/class.service');
const sessionService = require('../../sessions/services/session.service');
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
    const force = String(req.query.force || req.body?.force || '').toLowerCase() === 'true';
    const result = await classService.deleteClass(Number(req.params.id), centerId ?? undefined, { force });

    if (result?.error === 'has_attendance') {
      const attendance = Array.isArray(result.attendance)
        ? result.attendance.map((record: any) => ({
            attendance_id: record.attendance_id,
            student_id: record.student_id,
            teacher_id: record.teacher_id,
            class_id: record.class_id,
            session_id: record.session_id,
            attendance_date: record.attendance_date,
            status: record.status,
            remarks: record.remarks,
          }))
        : [];
      return res.status(409).json({
        error: 'Class has attendance records',
        attendance_count: attendance.length,
        attendance,
      });
    }

    if (!result?.row) return res.status(404).json({ error: 'Class not found' });
    res.json({
      message: 'Class deleted successfully',
      class: result.row,
      deleted_attendance_count: result.deletedAttendanceCount || 0,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete class', details: error.message || String(error) });
  }
};

const getClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    const classId = Number(req.params.id);
    res.json(await sessionService.listByClass(classId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions', details: error.message || String(error) });
  }
};

const generateClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const classId = Number(req.params.id);
    const month = Number(req.body?.month);
    const year = Number(req.body?.year);
    const durationMinutes = Number(req.body?.duration_minutes ?? 90);

    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'month must be between 1 and 12.' });
    }
    if (!Number.isFinite(year) || year < 2000) {
      return res.status(400).json({ error: 'year is invalid.' });
    }
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ error: 'duration_minutes must be a positive number.' });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.generateMonthlySessions({
      classId,
      centerId: centerId ?? undefined,
      teacherId,
      month,
      year,
      durationMinutes,
    });

    if (out && out.error === 'not_found') {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (out && out.error === 'missing_schedule') {
      return res.status(400).json({ error: 'Class schedule is missing or invalid.' });
    }

    res.json({ message: 'Sessions generated', ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to generate sessions', details: error.message || String(error) });
  }
};

const deleteUpcomingClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const classId = Number(req.params.id);
    const fromDate = String(req.query.from || req.body?.from || '').trim();
    const toDate = req.query.to || req.body?.to ? String(req.query.to || req.body.to).trim() : undefined;

    if (!fromDate) {
      return res.status(400).json({ error: 'from date is required (YYYY-MM-DD).' });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.deleteUpcomingSessions({
      classId,
      fromDate,
      toDate,
      centerId: centerId ?? undefined,
      teacherId,
    });

    res.json({ message: 'Sessions deleted', ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete sessions', details: error.message || String(error) });
  }
};

const deleteClassSessionById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const classId = Number(req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.deleteSessionById({
      classId,
      sessionId,
      centerId: centerId ?? undefined,
      teacherId,
    });

    res.json({ message: 'Session deleted', ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete session', details: error.message || String(error) });
  }
};

const createClassSession = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const classId = Number(req.params.id);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : req.body.teacher_id;
    
    const session = await sessionService.createSession({
      classId,
      centerId: centerId ?? req.body.center_id,
      teacherId,
      sessionDate: req.body.session_date,
      startTime: req.body.start_time,
      durationMinutes: Number(req.body.duration_minutes ?? 90),
    });
    
    res.status(201).json(session);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create session', details: error.message || String(error) });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  createClassSession,
  generateClassSessions,
  getClassSessions,
  deleteUpcomingClassSessions,
  deleteClassSessionById,
};


export {};
