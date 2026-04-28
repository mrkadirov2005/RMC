const gradeService = require('../services/grade.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllGrades = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = req.user?.userType === 'student' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    res.json(await gradeService.listGrades(centerId ?? undefined, teacherId, studentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

const getGradeById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await gradeService.getGrade(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Grade not found' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grade', details: error.message || String(error) });
  }
};

const createGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const requestBody = { ...req.body };
    if (!requestBody.teacher_id || requestBody.teacher_id <= 0) {
      if (req.user?.id) {
        requestBody.teacher_id = req.user.id;
      }
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(requestBody.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    const out = await gradeService.createGrade(requestBody, centerId ?? requestBody.center_id);
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Student or class does not belong to this center.' });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create grade', details: error.message || String(error) });
  }
};

const updateGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await gradeService.updateGrade(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Grade not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update grade', details: error.message || String(error) });
  }
};

const getGradesByStudent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.json(await gradeService.listByStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

const deleteGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const row = await gradeService.deleteGrade(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Grade not found' });
    res.json({ message: 'Grade deleted successfully', grade: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete grade', details: error.message || String(error) });
  }
};

const createBulkGrades = async (req: any, res: any) => {
  try {
    const { grades } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    if (req.user?.userType === 'teacher') {
      for (const g of grades) {
        const ok = await studentBelongsToTeacher(g.student_id, req.user?.id);
        if (!ok) {
          return res.status(403).json({ error: 'One or more students do not belong to this teacher.' });
        }
      }
    }
    const results = await gradeService.createBulk(grades, centerId ?? req.body.center_id);
    if (results.some((row: any) => row && row.error === 'invalid_center')) {
      return res.status(400).json({ error: 'One or more grades do not belong to this center.' });
    }
    res.status(201).json({ message: `${results.length} grades created successfully`, grades: results });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create bulk grades', details: error.message || String(error) });
  }
};

const getGradesBySession = async (req: any, res: any) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    res.json(await gradeService.listBySession(sessionId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

const upsertSessionScores = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    const out = await gradeService.upsertSessionScores(req.body, centerId ?? req.body.center_id);
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to upsert session scores', details: error.message || String(error) });
  }
};

module.exports = {
  getAllGrades,
  getGradeById,
  createGrade,
  updateGrade,
  getGradesByStudent,
  getGradesBySession,
  deleteGrade,
  createBulkGrades,
  upsertSessionScores,
};

export {};
