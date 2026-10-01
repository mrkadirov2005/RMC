const classService = require('../services/class.service');
const sessionService = require('../../sessions/services/session.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { hasClassListParams, parseClassListQuery } = require('./classListQuery');

const getAllClasses = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (hasClassListParams(req.query)) {
      const result = await classService.listClassesPaginated(parseClassListQuery(req.query), centerId ?? undefined, teacherId);
      return res.json(result);
    }
    res.json(await classService.listClasses(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruhlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getClassById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const row = await classService.getClass(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruhni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const out = await classService.createClass(req.body, centerId ?? undefined);
    if (out && 'error' in out && out.error === 'bad_teacher') {
      return res.status(400).json({ error: "O'qituvchi topilmadi. Iltimos, to'g'ri teacher_id kiriting" });
    }
    if (out && 'error' in out && out.error === 'bad_subject') {
      return res.status(400).json({ error: 'Bu markaz uchun yaratilgan mavjud fanni tanlang.' });
    }
    res.status(201).json((out as any).row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruhni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const row = await classService.updateClass(Number(req.params.id), req.body, centerId ?? undefined);
    if (row && row.error === 'bad_subject') {
      return res.status(400).json({ error: 'Bu markaz uchun yaratilgan mavjud fanni tanlang.' });
    }
    if (!row) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruhni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const force = String(req.query.force || '').toLowerCase() === 'true';
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
        error: 'Guruhda davomat yozuvlari mavjud',
        attendance_count: attendance.length,
        attendance,
      });
    }

    if (!result?.row) return res.status(404).json({ error: 'Guruh topilmadi' });
    res.json({
      message: "Guruh muvaffaqiyatli o'chirildi",
      class: result.row,
      deleted_session_count: result.deletedSessionCount || 0,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Guruhni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const purgeClass = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    const result = await classService.purgeClass(Number(req.params.id), centerId ?? undefined);
    if (!result?.row) return res.status(404).json({ error: "O'chirilgan guruh topilmadi" });
    res.json({ message: "Guruh butunlay o'chirildi", class: result.row });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Guruh boshqa yozuvlarda hali ishlatilmoqda',
        message: "Bu yozuvni butunlay o'chirishdan oldin bog'liq yozuvlarni o'chiring yoki boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "Guruhni butunlay o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const getClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student' && Number(req.params.id) !== Number(req.user?.class_id)) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    const classId = Number(req.params.id);
    res.json(await sessionService.listByClass(classId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyalarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getBulkClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classIds = String(req.query.class_ids || '')
      .split(',')
      .map((id: string) => Number(id.trim()))
      .filter((id: number) => Number.isFinite(id) && id > 0);

    if (classIds.length === 0) {
      return res.json([]);
    }

    res.json(await sessionService.listByClasses(classIds, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyalarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const generateClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classId = Number(req.params.id);
    const month = Number(req.body?.month);
    const year = Number(req.body?.year);
    const durationMinutes = Number(req.body?.duration_minutes ?? 90);

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
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }
    if (out && out.error === 'missing_schedule') {
      return res.status(400).json({ error: "Guruh jadvali topilmadi yoki noto'g'ri." });
    }

    res.json({ message: 'Sessiyalar yaratildi', ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyalarni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const deleteUpcomingClassSessions = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classId = Number(req.params.id);
    const fromDate = String(req.query.from || req.body?.from || '').trim();
    const toDate = req.query.to || req.body?.to ? String(req.query.to || req.body.to).trim() : undefined;

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.deleteUpcomingSessions({
      classId,
      fromDate,
      toDate,
      centerId: centerId ?? undefined,
      teacherId,
    });

    res.json({ message: "Sessiyalar o'chirildi", ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyalarni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const deleteClassSessionById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classId = Number(req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "sessionId ko'rsatilishi shart." });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.deleteSessionById({
      classId,
      sessionId,
      centerId: centerId ?? undefined,
      teacherId,
    });

    res.json({ message: "Sessiya o'chirildi", ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyani o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const purgeClassSessionById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classId = Number(req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "sessionId ko'rsatilishi shart." });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const out = await sessionService.purgeSessionById({
      classId,
      sessionId,
      centerId: centerId ?? undefined,
      teacherId,
    });

    if (!out.deleted) return res.status(404).json({ error: "O'chirilgan sessiya topilmadi" });
    res.json({ message: "Sessiya butunlay o'chirildi", ...out });
  } catch (error: any) {
    console.error('Database error:', error);
    if (error?.code === '23503') {
      return res.status(409).json({
        error: 'Sessiya boshqa yozuvlarda hali ishlatilmoqda',
        message: "Bu yozuvni butunlay o'chirishdan oldin bog'liq yozuvlarni o'chiring yoki boshqasiga o'tkazing.",
        details: error.detail,
      });
    }
    res.status(500).json({ error: "Sessiyani butunlay o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const updateClassSession = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    if (req.user?.userType === 'student') {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }

    const classId = Number(req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!Number.isFinite(sessionId)) {
      return res.status(400).json({ error: "sessionId ko'rsatilishi shart." });
    }

    const startTime = String(req.body.start_time || '').slice(0, 5);
    const endTime = String(req.body.end_time || '').slice(0, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || endTime <= startTime) {
      return res.status(400).json({ error: "To'g'ri start_time va end_time ko'rsatilishi shart (tugash vaqti boshlanishdan keyin bo'lishi kerak)." });
    }

    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    const updated = await sessionService.updateSessionTime({
      classId,
      sessionId,
      centerId: centerId ?? undefined,
      teacherId,
      startTime,
      endTime,
    });

    if (!updated || (updated as any).error) {
      return res.status(404).json({ error: 'Sessiya topilmadi' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyani yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const createClassSession = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
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

    if (session && (session as any).error === 'not_found') {
      return res.status(404).json({ error: 'Guruh topilmadi' });
    }

    res.status(201).json(session);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Sessiyani yaratib bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getAllClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  purgeClass,
  createClassSession,
  updateClassSession,
  generateClassSessions,
  getClassSessions,
  getBulkClassSessions,
  deleteUpcomingClassSessions,
  deleteClassSessionById,
  purgeClassSessionById,
};


export {};
