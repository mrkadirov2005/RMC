const kpiService = require('../services/kpi.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { teacherInCenter } = require('../../../shared/tenantDb');

const getOverview = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const result = await kpiService.getOverview({ centerId: centerId ?? undefined, year, month });
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "KPI sharhini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getTeacherDetail = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const teacherId = Number(req.params.teacherId);
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required.' });
    }
    if (centerId) {
      const ok = await teacherInCenter(teacherId, centerId);
      if (!ok) return res.status(404).json({ error: 'Teacher not found in this center.' });
    }
    const detail = await kpiService.getTeacherDetail({ teacherId, centerId: centerId ?? undefined });
    if (!detail) {
      return res.status(404).json({ error: "O'qituvchi topilmadi." });
    }
    res.json(detail);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchi KPI tafsilotini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const upsert = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    const teacherId = Number(req.body.teacher_id);
    if (effectiveCenterId) {
      const ok = await teacherInCenter(teacherId, effectiveCenterId);
      if (!ok) return res.status(400).json({ error: "O'qituvchi bu markazga tegishli emas." });
    }

    const record = await kpiService.upsertKpi({
      teacherId,
      centerId: effectiveCenterId ?? undefined,
      kpiYear: Number(req.body.kpi_year),
      kpiMonth: Number(req.body.kpi_month),
      contributionScore: Number(req.body.contribution_score),
      teachingQualityScore: Number(req.body.teaching_quality_score),
      notes: req.body.notes,
      actingUser: req.user,
    });
    res.status(201).json(record);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "KPI yozuvini saqlab bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getOverview,
  getTeacherDetail,
  upsert,
};

export {};
