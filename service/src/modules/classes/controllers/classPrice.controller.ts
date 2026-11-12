// Group price history and "Change group payment". Who may change prices is set by the developer
// (Technical section → Permissions: owners, admins); the developer always may. Admins and
// teachers (own groups) see the history; students see neither.
const classPriceService = require('../services/classPrice.service');
const permissions = require('../../developer/permissions');
const { makeController, actorOf } = require('../priceKit');

const { handle } = makeController('Class price', {
  bad_amount: [400, "Narx noto'g'ri"],
  bad_month: [400, "Oy noto'g'ri: 12 oy oldin va 12 oy keyin oralig'ida bo'lishi kerak"],
  not_found: [404, 'Guruh topilmadi'],
  price_not_allowed: [403, "Guruh to'lovini o'zgartirishga ruxsatingiz yo'q"],
});

const getHistory = handle("Narxlar tarixini yuklab bo'lmadi", async (req: any) => {
  if (req.user?.userType === 'student') return { error: 'forbidden' };
  const actor = actorOf(req);
  if (!actor.centerId && !actor.isGlobal) return { error: 'forbidden' };
  const teacherId = actor.userType === 'teacher' ? actor.id : null;
  return classPriceService.history(Number(req.params.id), actor.centerId, teacherId);
});

// Whether the signed-in user may change group prices (the panel shows or hides the controls).
const getPermission = handle("Ruxsatni yuklab bo'lmadi", async (req: any) => ({
  can_change: await permissions.allows(req.user, 'change_group_price'),
}));

const changePrice = handle("Narxni o'zgartirib bo'lmadi", async (req: any) => {
  if (!await permissions.allows(req.user, 'change_group_price')) return { error: 'price_not_allowed' };
  const actor = actorOf(req);
  if (!actor.centerId && !actor.isGlobal) return { error: 'forbidden' };
  return classPriceService.changePrice(Number(req.params.id), req.body, actor.centerId, actor);
}, 201);

module.exports = { getHistory, getPermission, changePrice };

export {};
