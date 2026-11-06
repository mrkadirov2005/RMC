// Group price history and "Change group payment". Only the developer account (a superuser
// flagged is_developer) changes prices; admins and teachers (own groups) see the history;
// students see neither.
const classPriceService = require('../services/classPrice.service');
const { makeController, actorOf } = require('../../appkit/kit');

const { handle } = makeController('Class price', {
  bad_amount: [400, "Narx noto'g'ri"],
  bad_month: [400, "Oy noto'g'ri: 12 oy oldin va 12 oy keyin oralig'ida bo'lishi kerak"],
  not_found: [404, 'Guruh topilmadi'],
  developer_only: [403, "Guruh to'lovini faqat dasturchi o'zgartira oladi"],
});

const isDeveloper = (user: any) => user?.userType === 'superuser' && user?.is_developer === true;

const getHistory = handle("Narxlar tarixini yuklab bo'lmadi", async (req: any) => {
  if (req.user?.userType === 'student') return { error: 'forbidden' };
  const actor = actorOf(req);
  if (!actor.centerId && !actor.isGlobal) return { error: 'forbidden' };
  const teacherId = actor.userType === 'teacher' ? actor.id : null;
  return classPriceService.history(Number(req.params.id), actor.centerId, teacherId);
});

const changePrice = handle("Narxni o'zgartirib bo'lmadi", async (req: any) => {
  if (!isDeveloper(req.user)) return { error: 'developer_only' };
  const actor = actorOf(req);
  if (!actor.centerId && !actor.isGlobal) return { error: 'forbidden' };
  return classPriceService.changePrice(Number(req.params.id), req.body, actor.centerId, actor);
}, 201);

module.exports = { getHistory, changePrice };

export {};
