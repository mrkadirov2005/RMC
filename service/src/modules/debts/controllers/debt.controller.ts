const debtService = require('../services/debt.service');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const getAllDebts = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    res.json(await debtService.listDebts(centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const getDebtById = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const row = await debtService.getDebt(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Qarz topilmadi' });
    if (req.user?.userType === 'student' && row.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const createDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(req.body.student_id, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    res.status(201).json(await debtService.createDebt({ ...req.body, center_id: centerId }));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const updateDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const row = await debtService.updateDebt(Number(req.params.id), req.body, centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Qarz topilmadi' });
    res.json(row);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzni yangilab bo'lmadi", details: error.message || String(error) });
  }
};

const getDebtsByStudent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    res.json(await debtService.listByStudent(studentId, centerId ?? undefined, teacherId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzlarni yuklab bo'lmadi", details: error.message || String(error) });
  }
};

const deleteDebt = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const row = await debtService.deleteDebt(Number(req.params.id), centerId ?? undefined, teacherId);
    if (!row) return res.status(404).json({ error: 'Qarz topilmadi' });
    res.json({ message: "Qarz muvaffaqiyatli o'chirildi", debt: row });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzni o'chirib bo'lmadi", details: error.message || String(error) });
  }
};

const analyzeUnpaidMonths = async (req: any, res: any) => {
  try {
    const { centerId, isGlobal } = getScopedCenterId(req);
    const { start_date, end_date } = req.query;
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    const data = await debtService.analyzeUnpaidMonths(String(centerId ?? ''), start_date, end_date, teacherId);
    res.json(data);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lanmagan oylarni tahlil qilib bo'lmadi", details: error.message || String(error) });
  }
};

const generateDebtsFromAnalysis = async (req: any, res: any) => {
  try {
    const { student_ids, monthly_fee, remarks } = req.body;
    const { centerId, isGlobal } = getScopedCenterId(req);
    const teacherId = req.user?.userType === 'teacher' ? req.user?.id : undefined;
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (!centerId && isGlobal) return res.status(400).json({ error: "Bu amal uchun center_id ko'rsatilishi shart." });
    const { createdDebts } = await debtService.generateDebtsFromAnalysis(student_ids, monthly_fee, centerId ?? undefined, remarks, teacherId);
    res.status(201).json({
      message: `${createdDebts.length} ta qarz yozuvi yaratildi`,
      debts: createdDebts,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "Qarzlarni yaratib bo'lmadi", details: error.message || String(error) });
  }
};

const getPaymentSummary = async (req: any, res: any) => {
  try {
    const studentId = Number(req.params.studentId);
    const { centerId, isGlobal } = getScopedCenterId(req);
    if (!centerId && !isGlobal) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    if (req.user?.userType === 'student' && studentId !== req.user?.id) {
      return res.status(403).json({ error: 'Kirish rad etildi.' });
    }
    if (req.user?.userType === 'teacher') {
      const ok = await studentBelongsToTeacher(studentId, req.user?.id);
      if (!ok) return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    res.json(await debtService.getPaymentSummary(studentId));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: "To'lovlar xulosasini olib bo'lmadi", details: error.message || String(error) });
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
