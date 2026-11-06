// Group price history and "Change group payment". Only the developer account (a superuser
// flagged is_developer) changes prices; admins and teachers (own groups) see the history;
// students see neither.
const classPriceService = require('../services/classPrice.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const ERRORS: Record<string, [number, string]> = {
  bad_amount: [400, "Narx noto'g'ri"],
  bad_month: [400, "Oy noto'g'ri: 12 oy oldin va 12 oy keyin oralig'ida bo'lishi kerak"],
  not_found: [404, 'Guruh topilmadi'],
  forbidden: [403, "Bu amalni bajarishga ruxsatingiz yo'q."],
  developer_only: [403, "Guruh to'lovini faqat dasturchi o'zgartira oladi"],
};

// Wraps a handler: a result with { error } becomes that error's status; anything else is sent.
const handle = (message: string, run: (req: any) => Promise<any>, status = 200) => async (req: any, res: any) => {
  try {
    const result = await run(req);
    if (result && typeof result === 'object' && typeof result.error === 'string') {
      const [code, text] = ERRORS[result.error] || [400, 'Xatolik'];
      return res.status(code).json({ error: text, code: result.error.toUpperCase() });
    }
    res.status(status).json(result);
  } catch (error: any) {
    console.error('Class price error:', error);
    res.status(500).json({ error: message });
  }
};

const actorOf = (req: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  return {
    userType: req.user.userType,
    id: Number(req.user.id),
    name: req.user.username || req.user.email || null,
    centerId: centerId ?? req.user.center_id ?? null,
    isGlobal: Boolean(isGlobal),
  };
};

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
