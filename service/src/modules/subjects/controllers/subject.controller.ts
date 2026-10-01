const subjectService = require('../services/subject.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const getAllSubjects = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    res.json(await subjectService.listSubjects(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanlarni yuklab bo'lmadi" });
  }
};

const getSubjectById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await subjectService.getSubject(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Fan topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getSubjectsByClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const classId = Number(req.params.classId);
    if (req.user?.userType === 'student' && Number(req.user?.class_id) !== classId) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    res.json(await subjectService.listByClass(classId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanlarni yuklab bo'lmadi" });
  }
};

const createSubject = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await subjectService.createSubject(req.body, centerId ?? req.body.center_id, teacherId);
    if (out && out.error === 'invalid_center') {
      return res.status(400).json({ error: 'Guruh bu markazga tegishli emas.' });
    }
    if (out && out.error === 'forbidden') {
      return res.status(403).json({ error: 'Class does not belong to this teacher.' });
    }
    if (out && out.error === 'class_subject_exists') {
      return res.status(409).json({ message: 'This class already has an assigned subject.' });
    }
    res.status(201).json(out);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateSubject = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await subjectService.updateSubject(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (row && row.error === 'invalid_center') {
      return res.status(400).json({ error: 'Guruh bu markazga tegishli emas.' });
    }
    if (row && row.error === 'forbidden') {
      return res.status(403).json({ error: 'Class does not belong to this teacher.' });
    }
    if (row && row.error === 'class_subject_exists') {
      return res.status(409).json({ message: 'This class already has an assigned subject.' });
    }
    if (!row) return res.status(404).json({ error: 'Fan topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteSubject = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const row = await subjectService.deleteSubject(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Fan topilmadi' });
    res.json({ message: "Fan muvaffaqiyatli o'chirildi", subject: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Fanni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllSubjects,
  getSubjectById,
  getSubjectsByClass,
  createSubject,
  updateSubject,
  deleteSubject,
};

export {};
