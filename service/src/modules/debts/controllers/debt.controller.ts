const debtService = require('../services/debt.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllDebts = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    res.json(await debtService.listDebts(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

const getDebtById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    const row = await debtService.getDebt(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Debt not found' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debt', details: error.message || String(error) });
  }
};

const createDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(req.body.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.status(201).json(await debtService.createDebt({ ...req.body, center_id: centerId }));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create debt', details: error.message || String(error) });
  }
};

const updateDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    const row = await debtService.updateDebt(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Debt not found' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update debt', details: error.message || String(error) });
  }
};

const getDebtsByStudent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.json(await debtService.listByStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

const deleteDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    const row = await debtService.deleteDebt(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Debt not found' });
    res.json({ message: 'Debt deleted successfully', debt: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete debt', details: error.message || String(error) });
  }
};

const analyzeUnpaidMonths = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const { start_date, end_date } = req.query;
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    const data = await debtService.analyzeUnpaidMonths(String(centerId ?? ''), start_date, end_date, teacherId);
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to analyze unpaid months', details: error.message || String(error) });
  }
};

const generateDebtsFromAnalysis = async (req: any, res: any) => {
  try {
    const { student_ids, monthly_fee, remarks } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: 'center_id is required for superuser actions.' });
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'student_ids array is required' });
    }
    if (!monthly_fee || monthly_fee <= 0) {
      return res.status(400).json({ error: 'valid monthly_fee is required' });
    }
    const { createdDebts } = await debtService.generateDebtsFromAnalysis(student_ids, monthly_fee, centerId ?? undefined, remarks, teacherId);
    res.status(201).json({
      message: `Created ${createdDebts.length} debt records`,
      debts: createdDebts,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to generate debts', details: error.message || String(error) });
  }
};

const getPaymentSummary = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Center scope required.' });
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: 'Student does not belong to this teacher.' });
    }
    res.json(await debtService.getPaymentSummary(studentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to get payment summary', details: error.message || String(error) });
  }
};

module.exports = {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  getDebtsByStudent,
  deleteDebt,
  analyzeUnpaidMonths,
  generateDebtsFromAnalysis,
  getPaymentSummary,
};

export {};
