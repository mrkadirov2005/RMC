const salaryService = require('../services/salary.service');
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
    const result = await salaryService.getOverview({ centerId: centerId ?? undefined, year, month });
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Maosh sharhini yuklab bo'lmadi", details: error.message || String(error) });
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
      return res.status(400).json({ error: "teacherId ko'rsatilishi shart." });
    }
    if (centerId) {
      const ok = await teacherInCenter(teacherId, centerId);
      if (!ok) return res.status(404).json({ error: "O'qituvchi bu markazda topilmadi." });
    }
    const requestedMonths = Number(req.query.months || 6);
    const months = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;
    const detail = await salaryService.getTeacherDetail({ teacherId, centerId: centerId ?? undefined, months });
    if (!detail) {
      return res.status(404).json({ error: "O'qituvchi topilmadi." });
    }
    res.json(detail);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "O'qituvchi maosh tafsilotini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getMyDetail = async (req: any, res: any) => {
  try {
    const teacherId = Number(req.user?.id);
    if (!teacherId) {
      return res.status(400).json({ error: "O'qituvchi ID sini aniqlab bo'lmadi." });
    }
    const { centerId } = getScopedCenterId(req);
    const requestedMonths = Number(req.query.months || 6);
    const months = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;
    const detail = await salaryService.getTeacherDetail({ teacherId, centerId: centerId ?? undefined, months });
    if (!detail) {
      return res.status(404).json({ error: 'Maosh profili topilmadi.' });
    }
    res.json(detail);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Maosh tafsilotini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

// Centers bill by Tashkent time, so "this month" is the Tashkent month.
const currentMonthKey = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent', year: 'numeric', month: '2-digit' }).format(new Date());

const getMyGroupPayments = async (req: any, res: any) => {
  try {
    const teacherId = Number(req.user?.id);
    if (!teacherId) {
      return res.status(400).json({ error: "O'qituvchi ID sini aniqlab bo'lmadi." });
    }
    const requested = String(req.query.month || '');
    const monthKey = /^\d{4}-(0[1-9]|1[0-2])$/.test(requested) ? requested : currentMonthKey();
    const { centerId } = getScopedCenterId(req);
    const result = await salaryService.getMyGroupPayments({ teacherId, centerId: centerId ?? undefined, monthKey });
    if (!result) {
      return res.status(404).json({ error: 'Maosh profili topilmadi.' });
    }
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lov statistikasini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const markPaid = async (req: any, res: any) => {
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

    const record = await salaryService.markPaid({
      teacherId,
      salaryYear: Number(req.body.salary_year),
      salaryMonth: Number(req.body.salary_month),
      amount: Number(req.body.amount),
      paymentMethod: req.body.payment_method,
      notes: req.body.notes,
      centerId: effectiveCenterId ?? undefined,
      actingUser: req.user,
    });
    res.status(201).json(record);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Maoshni to'langan deb belgilab bo'lmadi", details: error.message || String(error) });
  }
};

const updatePatch = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: "id ko'rsatilishi shart." });
    }

    const record = await salaryService.updateSalaryRecord({
      id,
      patch: {
        amount: req.body.amount,
        is_paid: req.body.is_paid,
        payment_method: req.body.payment_method,
        notes: req.body.notes,
      },
      centerId: centerId ?? undefined,
      actingUser: req.user,
    });
    if (!record) {
      return res.status(404).json({ error: 'Maosh yozuvi topilmadi.' });
    }
    res.json(record);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Maosh yozuvini yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const getMonthlySummary = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    }
    const requestedMonths = Number(req.query.months || 6);
    const months = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;
    const result = await salaryService.getMonthlySummary({ centerId: centerId ?? undefined, months });
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Oylik maosh xulosasini yuklab bo'lmadi", details: error.message || String(error) });
  }
};

module.exports = {
  getOverview,
  getTeacherDetail,
  getMyDetail,
  getMyGroupPayments,
  markPaid,
  updatePatch,
  getMonthlySummary,
};

export {};
