const salaryService = require('../services/salary.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { teacherInCenter } = require('../../../shared/tenantDb');

const getOverview = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const result = await salaryService.getOverview({ centerId: centerId ?? undefined, year, month });
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch salary overview', details: error.message || String(error) });
  }
};

const getTeacherDetail = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const teacherId = Number(req.params.teacherId);
    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required.' });
    }
    if (centerId) {
      const ok = await teacherInCenter(teacherId, centerId);
      if (!ok) return res.status(404).json({ error: 'Teacher not found in this center.' });
    }
    const requestedMonths = Number(req.query.months || 6);
    const months = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;
    const detail = await salaryService.getTeacherDetail({ teacherId, centerId: centerId ?? undefined, months });
    if (!detail) {
      return res.status(404).json({ error: 'Teacher not found.' });
    }
    res.json(detail);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher salary detail', details: error.message || String(error) });
  }
};

const markPaid = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const effectiveCenterId = centerId ?? req.body.center_id;

    const teacherId = Number(req.body.teacher_id);
    if (effectiveCenterId) {
      const ok = await teacherInCenter(teacherId, effectiveCenterId);
      if (!ok) return res.status(400).json({ error: 'Teacher does not belong to this center.' });
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
    res.status(500).json({ error: 'Failed to mark salary as paid', details: error.message || String(error) });
  }
};

const updatePatch = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const id = Number(req.params.id);
    if (!id) {
      return res.status(400).json({ error: 'id is required.' });
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
      return res.status(404).json({ error: 'Salary record not found.' });
    }
    res.json(record);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update salary record', details: error.message || String(error) });
  }
};

const getMonthlySummary = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) {
      return res.status(403).json({ error: 'Center scope required.' });
    }
    if (!centerId && isGlobal) {
      return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    }
    const requestedMonths = Number(req.query.months || 6);
    const months = Number.isFinite(requestedMonths) ? Math.min(Math.max(requestedMonths, 1), 24) : 6;
    const result = await salaryService.getMonthlySummary({ centerId: centerId ?? undefined, months });
    res.json(result);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch salary monthly summary', details: error.message || String(error) });
  }
};

module.exports = {
  getOverview,
  getTeacherDetail,
  markPaid,
  updatePatch,
  getMonthlySummary,
};

export {};
