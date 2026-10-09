const cashReportService = require('../services/cashReport.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const INVALID: Record<string, string> = {
  invalid_date: "Sana noto'g'ri.",
  invalid_range: "Sana oralig'i noto'g'ri.",
  invalid_amount: "Summa noto'g'ri.",
  invalid_description: 'Xarajat izohini kiriting (500 belgigacha).',
  invalid_method: "To'lov usuli noto'g'ri: naqd, karta yoki hisob raqam.",
};
const sendInvalid = (res: any, out: any) => {
  if (!out?.error || !INVALID[out.error]) return false;
  res.status(400).json({ error: INVALID[out.error] });
  return true;
};

// Admins see their branch; the owner the selected branch, or every branch when none is selected.
const getDailyReport = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const out = await cashReportService.getDailyReport(String(req.query?.date || ''), scope.centerId ?? undefined);
    if (sendInvalid(res, out)) return;
    res.json(out);
  } catch (error: any) {
    sendError(res, error, "Kunlik hisobotni yuklab bo'lmadi");
  }
};

const getExpenses = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const out = await cashReportService.listExpenses({ from: req.query?.from, to: req.query?.to }, scope.centerId ?? undefined);
    if (sendInvalid(res, out)) return;
    res.json(out);
  } catch (error: any) {
    sendError(res, error, "Xarajatlarni yuklab bo'lmadi");
  }
};

const createExpense = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const createdByName = await paymentService.resolveCashierName(req.user);
    const out = await cashReportService.createExpense(req.body, Number(scope.centerId), createdByName);
    if (sendInvalid(res, out)) return;
    res.status(201).json(out);
  } catch (error: any) {
    sendError(res, error, "Xarajatni saqlab bo'lmadi");
  }
};

const deleteExpense = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const expenseId = Number(req.params?.id);
    if (!Number.isInteger(expenseId) || expenseId <= 0) return res.status(400).json({ error: "Xarajat ID noto'g'ri." });
    const deleted = await cashReportService.deleteExpense(expenseId, scope.centerId ?? undefined);
    if (!deleted) return res.status(404).json({ error: 'Xarajat topilmadi.' });
    res.json({ message: "Xarajat o'chirildi" });
  } catch (error: any) {
    sendError(res, error, "Xarajatni o'chirib bo'lmadi");
  }
};

module.exports = { getDailyReport, getExpenses, createExpense, deleteExpense };
export {};
