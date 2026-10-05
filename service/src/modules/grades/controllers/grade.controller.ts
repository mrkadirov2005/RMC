const gradeService = require('../services/grade.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllGrades = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const studentId = req.user?.userType === 'student' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    res.json(await gradeService.listGrades(centerId ?? undefined, teacherId, studentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Baholarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getGradeById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await gradeService.getGrade(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Baho topilmadi' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Bahoni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const requestBody = { ...req.body };
    if (!requestBody.teacher_id || requestBody.teacher_id <= 0) {
      if (req.user?.id) {
        requestBody.teacher_id = req.user.id;
      }
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(requestBody.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    const out = await gradeService.createGrade(requestBody, centerId ?? requestBody.center_id);
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: "O'quvchi yoki guruh bu markazga tegishli emas." });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Bahoni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await gradeService.updateGrade(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Baho topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Bahoni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const getGradesByStudent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    res.json(await gradeService.listByStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Baholarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteGrade = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await gradeService.deleteGrade(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Baho topilmadi' });
    res.json({ message: "Baho muvaffaqiyatli o'chirildi", grade: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Bahoni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const createBulkGrades = async (req: any, res: any) => {
  try {
    const { grades } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'teacher') {
      for (const g of grades) {
        const ok = await studentBelongsToTeacher(g.student_id, req.user?.id);
        if (!ok) {
          return res.status(403).json({ error: "Bir yoki bir nechta o'quvchi bu o'qituvchiga tegishli emas." });
        }
      }
    }
    const results = await gradeService.createBulk(grades, centerId ?? req.body.center_id);
    if (results.some((row: any) => row && row.error === 'invalid_center')) {
      return res.status(400).json({ error: 'Bir yoki bir nechta baho bu markazga tegishli emas.' });
    }
    res.status(201).json({ message: `${results.length} ta baho muvaffaqiyatli yaratildi`, grades: results });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Baholarni ommaviy yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const getGradesBySession = async (req: any, res: any) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    res.json(await gradeService.listBySession(sessionId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Baholarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const upsertSessionScores = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const out = await gradeService.upsertSessionScores(req.body, centerId ?? req.body.center_id);
    if (out && out.error === 'session_id_required') {
      return res.status(400).json({ error: "session_id ko'rsatilishi shart." });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Dars ballarini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

const saveSessionWorkflow = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'teacher') {
      const records = Array.isArray(req.body?.records) ? req.body.records : [];
      for (const record of records) {
        const ok = await studentBelongsToTeacher(Number(record.student_id), req.user?.id);
        if (!ok) return res.status(403).json({ error: "Bir yoki bir nechta o'quvchi bu o'qituvchiga tegishli emas." });
      }
    }
    // A teacher always records their own lessons; never trust (or default) the id sent by the client.
    const body = req.user?.userType === 'teacher' ? { ...req.body, teacher_id: Number(req.user.id) } : req.body;
    const out = await gradeService.saveSessionWorkflow(body, centerId ?? body.center_id);
    if (out && out.error === 'invalid_payload') {
      return res.status(400).json({ error: "Dars jarayoni ma'lumotlari noto'g'ri." });
    }
    if (out && out.error === 'multiple_stellar_students') {
      return res.status(400).json({ error: "Bitta darsda faqat bitta a'lochi o'quvchi tanlanishi mumkin." });
    }
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Guruh bu markazga tegishli emas.' });
    }
    res.json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Dars jarayonini saqlab bo'lmadi", details: error.message || String(error) });
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
  saveSessionWorkflow,
};

export {};
