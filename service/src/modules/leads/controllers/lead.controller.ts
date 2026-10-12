const leadService = require('../services/lead.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ERRORS: Record<string, [number, string]> = {
  invalid_stage: [400, "Bo'lim noto'g'ri."],
  name_phone_required: [400, 'Ism va telefon raqamini kiriting.'],
  invalid_date: [400, "Qo'ng'iroq sanasi noto'g'ri."],
  invalid_outcome: [400, "Natija noto'g'ri."],
  not_found: [404, 'Yozuv topilmadi.'],
};
const sendKnownError = (res: any, out: any) => {
  const known = out?.error && ERRORS[out.error];
  if (!known) return false;
  res.status(known[0]).json({ error: known[1] });
  return true;
};
const idOf = (req: any) => {
  const id = Number(req.params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getLeads = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const out = await leadService.list(String(req.query?.stage || 'waiting_group'), scope.centerId ?? undefined);
    if (sendKnownError(res, out)) return;
    res.json(out);
  } catch (error: any) {
    sendError(res, error, "Ro'yxatni yuklab bo'lmadi");
  }
};

const getDueCount = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    res.json({ due: await leadService.dueCount(scope.centerId ?? undefined) });
  } catch (error: any) {
    sendError(res, error, "Eslatmalarni yuklab bo'lmadi");
  }
};

const createLead = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req, { requireConcreteCenter: true });
    if (sendScopeError(res, scope)) return;
    const out = await leadService.create(req.body, Number(scope.centerId), await paymentService.resolveCashierName(req.user));
    if (sendKnownError(res, out)) return;
    res.status(201).json(out.row);
  } catch (error: any) {
    sendError(res, error, "Saqlab bo'lmadi");
  }
};

const updateLead = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    const out = await leadService.update(id, req.body, scope.centerId ?? undefined);
    if (sendKnownError(res, out)) return;
    res.json(out.row);
  } catch (error: any) {
    sendError(res, error, "Saqlab bo'lmadi");
  }
};

const closeLead = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    const out = await leadService.close(id, req.body, scope.centerId ?? undefined);
    if (sendKnownError(res, out)) return;
    res.json({ message: 'Saqlandi' });
  } catch (error: any) {
    sendError(res, error, "Saqlab bo'lmadi");
  }
};

module.exports = { getLeads, getDueCount, createLead, updateLead, closeLead };
export {};
