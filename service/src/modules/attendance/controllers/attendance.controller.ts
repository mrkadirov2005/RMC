const attendanceService = require('../services/attendance.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    res.json(await attendanceService.list(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getAttendanceById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await attendanceService.getById(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Davomat topilmadi' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    
    // Use authenticated user's ID if teacher_id is missing or invalid
    const requestBody = { ...req.body };
    if (!requestBody.teacher_id || requestBody.teacher_id <= 0) {
      if (req.user?.id) {
        requestBody.teacher_id = req.user.id;
        console.log(`Using authenticated user ID ${req.user.id} as teacher_id`);
      } else {
        return res.status(400).json({ error: 'Teacher ID is required.' });
      }
    }
    
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(requestBody.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    const out = await attendanceService.create(requestBody, centerId ?? requestBody.center_id);
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: "O'quvchi bu markazga tegishli emas." });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await attendanceService.update(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Davomat topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const getAttendanceByStudent = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const studentId = Number(req.params.studentId);
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    res.json(await attendanceService.byStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getAttendanceByClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    res.json(await attendanceService.byClass(Number(req.params.classId), centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getAttendanceBySession = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    res.json(await attendanceService.bySession(Number(req.params.sessionId), centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteAttendance = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await attendanceService.remove(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Davomat yozuvi topilmadi' });
    res.json({ message: "Davomat yozuvi muvaffaqiyatli o'chirildi", attendance: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Davomatni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  getAttendanceByStudent,
  getAttendanceByClass,
  getAttendanceBySession,
  deleteAttendance,
};

export {};
