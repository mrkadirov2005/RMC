const studentLinkService = require('../services/studentLink.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ERRORS: Record<string, [number, string]> = {
  invalid_relation: [400, "Bog'liqlik turini tanlang: aka-uka/opa-singil, qarindosh yoki do'st."],
  invalid_members: [400, "Kamida 2 ta, ko'pi bilan 20 ta o'quvchi tanlang."],
  students_not_found: [400, "Tanlangan o'quvchilar topilmadi yoki bitta filialda emas."],
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

const getLinks = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    res.json(await studentLinkService.list(scope.centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, "Qarindoshlar ro'yxatini yuklab bo'lmadi");
  }
};

const createLink = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const out = await studentLinkService.create(req.body, scope.centerId ?? undefined, await paymentService.resolveCashierName(req.user));
    if (sendKnownError(res, out)) return;
    res.status(201).json(out.row);
  } catch (error: any) {
    sendError(res, error, "Bog'liqlikni saqlab bo'lmadi");
  }
};

const updateLink = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    const out = await studentLinkService.update(id, req.body, scope.centerId ?? undefined);
    if (sendKnownError(res, out)) return;
    res.json({ message: 'Saqlandi' });
  } catch (error: any) {
    sendError(res, error, "Bog'liqlikni saqlab bo'lmadi");
  }
};

const deleteLink = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    if (!(await studentLinkService.remove(id, scope.centerId ?? undefined))) return sendKnownError(res, { error: 'not_found' });
    res.json({ message: "O'chirildi" });
  } catch (error: any) {
    sendError(res, error, "Bog'liqlikni o'chirib bo'lmadi");
  }
};

module.exports = { getLinks, createLink, updateLink, deleteLink };
export {};
