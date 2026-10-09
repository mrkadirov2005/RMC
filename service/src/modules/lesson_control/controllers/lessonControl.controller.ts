const service = require('../services/lessonControl.service');
const paymentService = require('../../payments/services/payment.service');
const { getCenterScope, sendError, sendScopeError } = require('../../../shared/controller');

const ERRORS: Record<string, [number, string]> = {
  invalid_date: [400, "Sana noto'g'ri."],
  invalid_time: [400, "Vaqt noto'g'ri (HH:mm)."],
  class_not_found: [404, 'Guruh topilmadi.'],
  center_required: [400, 'Filialni tanlang.'],
  already_exists: [409, "Bu kun allaqachon dam olish kuni deb belgilangan."],
  not_found: [404, "So'rov topilmadi yoki allaqachon ko'rib chiqilgan."],
};
const sendKnown = (res: any, out: any) => {
  const known = out?.error && ERRORS[out.error];
  if (!known) return false;
  res.status(known[0]).json({ error: known[1] });
  return true;
};
const isTeacher = (req: any) => req.user?.userType === 'teacher';
const isOwner = (req: any) => req.user?.userType === 'superuser' && String(req.user?.role || '').toLowerCase() === 'owner';
const adminOnly = (req: any, res: any) => {
  if (isTeacher(req)) { res.status(403).json({ error: 'Kirish rad etildi.' }); return true; }
  return false;
};
const idOf = (req: any) => {
  const id = Number(req.params?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const route = (message: string, run: (req: any, res: any, centerId?: number) => Promise<any>) => async (req: any, res: any) => {
  try {
    const scope = getCenterScope(req);
    if (sendScopeError(res, scope)) return;
    await run(req, res, scope.centerId ?? undefined);
  } catch (error: any) {
    sendError(res, error, message);
  }
};

// Teachers see their own discipline; admins see counts; KPI points are for the owner only.
const getDiscipline = route("Ball qo'yish nazoratini yuklab bo'lmadi", async (req, res, centerId) => {
  const out = await service.discipline(req.query, centerId, isTeacher(req) ? Number(req.user.id) : undefined);
  if (!isTeacher(req) && !isOwner(req)) out.teachers = out.teachers.map((teacher: any) => ({ ...teacher, summary: { ...teacher.summary, points: undefined, bonus: undefined } }));
  res.json(out);
});

const getMyDue = route("Eslatmalarni yuklab bo'lmadi", async (req, res) => {
  if (!isTeacher(req)) return res.json([]);
  res.json(await service.dueForTeacher(Number(req.user.id)));
});

const getDaysOff = route("Dam olish kunlarini yuklab bo'lmadi", async (req, res, centerId) => res.json(await service.listDaysOff(req.query, centerId)));

const addDayOff = route("Dam olish kunini saqlab bo'lmadi", async (req, res, centerId) => {
  if (adminOnly(req, res)) return;
  const out = await service.addDayOff(req.body, centerId, await paymentService.resolveCashierName(req.user));
  if (sendKnown(res, out)) return;
  res.status(201).json(out.row);
});

const removeDayOff = route("Dam olish kunini o'chirib bo'lmadi", async (req, res, centerId) => {
  if (adminOnly(req, res)) return;
  const id = idOf(req);
  if (!id || !(await service.deleteDayOff(id, centerId))) return res.status(404).json({ error: 'Yozuv topilmadi.' });
  res.json({ message: "O'chirildi" });
});

const getReschedules = route("So'rovlarni yuklab bo'lmadi", async (req, res, centerId) =>
  res.json(await service.listReschedules({ centerId, teacherId: isTeacher(req) ? Number(req.user.id) : undefined })));

const requestReschedule = route("So'rovni yuborib bo'lmadi", async (req, res) => {
  if (!isTeacher(req)) return res.status(403).json({ error: "Darsni ko'chirishni o'qituvchi so'raydi." });
  const out = await service.requestReschedule(req.body, Number(req.user.id));
  if (sendKnown(res, out)) return;
  res.status(201).json(out.row);
});

const decideReschedule = route("Qarorni saqlab bo'lmadi", async (req, res, centerId) => {
  if (adminOnly(req, res)) return;
  const id = idOf(req);
  if (!id) return res.status(400).json({ error: "ID noto'g'ri." });
  const out = await service.decideReschedule(id, req.body?.approve === true, await paymentService.resolveCashierName(req.user), centerId);
  if (sendKnown(res, out)) return;
  res.json({ message: 'Saqlandi' });
});

module.exports = { getDiscipline, getMyDue, getDaysOff, addDayOff, removeDayOff, getReschedules, requestReschedule, decideReschedule };
export {};
