const watchlistService = require('../services/watchlist.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ERRORS: Record<string, [number, string]> = {
  invalid_student: [400, "O'quvchi tanlanmagan."],
  contact_required: [400, "Kimga ma'lumot berilishini kiriting."],
  student_not_found: [404, "O'quvchi topilmadi."],
  already_watched: [409, "Bu o'quvchi allaqachon doimiy nazoratda."],
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

const getWatchlist = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    res.json(await watchlistService.list(scope.centerId ?? undefined));
  } catch (error: any) {
    sendError(res, error, "Doimiy nazorat ro'yxatini yuklab bo'lmadi");
  }
};

const addToWatchlist = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const out = await watchlistService.add(req.body, scope.centerId ?? undefined, await paymentService.resolveCashierName(req.user));
    if (sendKnownError(res, out)) return;
    res.status(201).json(out.row);
  } catch (error: any) {
    sendError(res, error, "O'quvchini doimiy nazoratga qo'shib bo'lmadi");
  }
};

const updateWatch = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    const out = await watchlistService.update(id, req.body, scope.centerId ?? undefined);
    if (sendKnownError(res, out)) return;
    res.json({ message: 'Saqlandi' });
  } catch (error: any) {
    sendError(res, error, "O'zgarishni saqlab bo'lmadi");
  }
};

const removeFromWatchlist = async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    const id = idOf(req);
    if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
    if (!(await watchlistService.remove(id, scope.centerId ?? undefined))) return sendKnownError(res, { error: 'not_found' });
    res.json({ message: "Doimiy nazoratdan olib tashlandi" });
  } catch (error: any) {
    sendError(res, error, "O'quvchini doimiy nazoratdan olib bo'lmadi");
  }
};

module.exports = { getWatchlist, addToWatchlist, updateWatch, removeFromWatchlist };
export {};
