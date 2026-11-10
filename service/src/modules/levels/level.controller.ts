// Levels of a subject. Admins/owners (subject or class access) add levels and put groups in them;
// only the developer account sets or changes a level's price; teachers may look.
const levelService = require('./level.service');
const { getScopedCenterId } = require('../../shared/tenant');

const ERRORS: Record<string, [number, string]> = {
  bad_name: [400, 'Daraja nomini kiriting'],
  bad_order: [400, "Tartib raqami noto'g'ri"],
  bad_amount: [400, "Narx noto'g'ri"],
  bad_month: [400, "Oy noto'g'ri: 12 oy oldin va 12 oy keyin oralig'ida bo'lishi kerak"],
  bad_level_month: [400, "Oy noto'g'ri: shu oy yoki 12 oygacha oldingi oy bo'lishi kerak"],
  subject_not_found: [404, 'Fan topilmadi'],
  level_not_found: [404, 'Daraja topilmadi'],
  not_found: [404, 'Guruh topilmadi'],
  level_exists: [409, 'Bu fanda shu nomli daraja bor'],
  level_has_groups: [409, "Darajada guruhlar bor: avval ularni boshqa darajaga o'tkazing"],
  same_level: [409, 'Guruh allaqachon shu darajada'],
  forbidden: [403, "Bu amalni bajarishga ruxsatingiz yo'q."],
  developer_only: [403, "Daraja narxini faqat dasturchi o'zgartira oladi"],
};

const handle = (message: string, run: (req: any) => Promise<any>, status = 200) => async (req: any, res: any) => {
  try {
    const result = await run(req);
    if (result && typeof result === 'object' && typeof result.error === 'string') {
      const [code, text] = ERRORS[result.error] || [400, 'Xatolik'];
      return res.status(code).json({ error: text, code: result.error.toUpperCase() });
    }
    res.status(status).json(result);
  } catch (error: any) {
    console.error('Level error:', error);
    res.status(500).json({ error: message });
  }
};

const actorOf = (req: any) => {
  const { centerId } = getScopedCenterId(req);
  return {
    userType: req.user.userType,
    id: Number(req.user.id),
    name: req.user.username || req.user.email || null,
    centerId: centerId ?? req.user.center_id ?? null,
  };
};

const isDeveloper = (user: any) => user?.userType === 'superuser' && user?.is_developer === true;

/** Owners, the developer, and admins with subject or class access. */
const canManage = (user: any) => {
  if (user?.userType !== 'superuser') return false;
  if (isDeveloper(user) || String(user.role || '').toLowerCase() === 'owner') return true;
  const permissions = user.permissions || [];
  return permissions.includes('CRUD_SUBJECT') || permissions.includes('CRUD_CLASS');
};

const canRead = (req: any) => ['superuser', 'teacher'].includes(req.user?.userType);

const listForSubject = handle("Darajalarni yuklab bo'lmadi", async (req: any) => {
  if (!canRead(req)) return { error: 'forbidden' };
  return levelService.listForSubject(Number(req.params.id), actorOf(req).centerId);
});

const listAll = handle("Darajalarni yuklab bo'lmadi", async (req: any) => {
  if (!canRead(req)) return { error: 'forbidden' };
  return levelService.listAll(actorOf(req).centerId);
});

const createLevel = handle("Darajani qo'shib bo'lmadi", async (req: any) => {
  if (!canManage(req.user)) return { error: 'forbidden' };
  return levelService.createLevel(Number(req.params.id), req.body, actorOf(req), isDeveloper(req.user));
}, 201);

const updateLevel = handle("Darajani saqlab bo'lmadi", async (req: any) => {
  if (!canManage(req.user)) return { error: 'forbidden' };
  return levelService.updateLevel(Number(req.params.id), req.body, actorOf(req));
});

const deleteLevel = handle("Darajani o'chirib bo'lmadi", async (req: any) => {
  if (!canManage(req.user)) return { error: 'forbidden' };
  return levelService.deleteLevel(Number(req.params.id), actorOf(req));
});

const levelHistory = handle("Narxlar tarixini yuklab bo'lmadi", async (req: any) => {
  if (!canRead(req)) return { error: 'forbidden' };
  return levelService.levelHistory(Number(req.params.id), actorOf(req).centerId);
});

const changeLevelPrice = handle("Narxni o'zgartirib bo'lmadi", async (req: any) => {
  if (!isDeveloper(req.user)) return { error: 'developer_only' };
  return levelService.changeLevelPrice(Number(req.params.id), req.body, actorOf(req));
}, 201);

const setClassLevel = handle("Guruh darajasini saqlab bo'lmadi", async (req: any) => {
  if (!canManage(req.user)) return { error: 'forbidden' };
  return levelService.setClassLevel(Number(req.params.id), req.body, actorOf(req));
});

module.exports = {
  listForSubject,
  listAll,
  createLevel,
  updateLevel,
  deleteLevel,
  levelHistory,
  changeLevelPrice,
  setClassLevel,
};

export {};
