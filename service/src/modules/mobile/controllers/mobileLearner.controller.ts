const learnerService = require('../services/mobileLearner.service');
const parentMobileService = require('../services/mobileParent.service');
const { pageParams } = require('../mobileAccess');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile data error:', error);
  res.status(500).json({ error: message });
};

// Whose data a request is about: the signed-in student, or the child a parent picked.
const targetOf = (req: any) =>
  req.child
    ? { studentId: Number(req.child.student_id), centerId: req.child.center_id ?? undefined }
    : { studentId: Number(req.user.id), centerId: req.user.center_id ?? undefined };

// @MOB-025 Lets a parent through only to their own linked child; sets req.child.
const requireLinkedChild = async (req: any, res: any, next: any) => {
  try {
    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId) || studentId < 1) {
      return res.status(400).json({ error: "O'quvchi noto'g'ri ko'rsatilgan" });
    }
    const child = await parentMobileService.findChild(Number(req.user.id), studentId);
    if (!child) {
      return res.status(403).json({ error: "Bu o'quvchi sizga biriktirilmagan.", code: 'CHILD_NOT_LINKED' });
    }
    req.child = child;
    next();
  } catch (error: any) {
    fail(res, error, "O'quvchini tekshirib bo'lmadi");
  }
};

// @MOB-026 GET /parent/children
const listChildren = async (req: any, res: any) => {
  try {
    const children = await parentMobileService.listChildren(Number(req.user.id));
    res.json({ items: children.map(({ linked_ids, ...child }: any) => child) });
  } catch (error: any) {
    fail(res, error, "Farzandlarni yuklab bo'lmadi");
  }
};

const withTarget = (message: string, load: (target: any, req: any) => Promise<any>) => async (req: any, res: any) => {
  try {
    const data = await load(targetOf(req), req);
    if (data == null) return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(data);
  } catch (error: any) {
    fail(res, error, message);
  }
};

const paging = (req: any) => {
  const { page, pageSize } = pageParams(req.query);
  return [page, pageSize] as const;
};

// @MOB-031 @MOB-026 Home screen data for a student or a parent's child.
const dashboard = withTarget("Ma'lumotlarni yuklab bo'lmadi", (t) => learnerService.dashboard(t.studentId, t.centerId));
// @MOB-027 Attendance history and totals.
const attendance = withTarget("Davomatni yuklab bo'lmadi", (t, req) => learnerService.attendance(t.studentId, t.centerId, ...paging(req)));
// @MOB-027 Weekly timetable.
const schedule = withTarget("Jadvalni yuklab bo'lmadi", (t) => learnerService.schedule(t.studentId, t.centerId));
// @MOB-028 Lesson results and monthly averages.
const grades = withTarget("Baholarni yuklab bo'lmadi", (t, req) => learnerService.grades(t.studentId, t.centerId, ...paging(req)));
// @MOB-029 Coin balance and history.
const coins = withTarget("Coinlarni yuklab bo'lmadi", (t, req) => learnerService.coins(t.studentId, t.centerId, ...paging(req)));
// @MOB-030 Balance, due date and payment history.
const payments = withTarget("To'lovlarni yuklab bo'lmadi", (t, req) => learnerService.payments(t.studentId, t.centerId, ...paging(req)));
// @MOB-127 @MOB-128 Home chart series: ?period=month (default) or ?period=day.
const progress = withTarget("Grafiklarni yuklab bo'lmadi", (t, req) =>
  learnerService.progress(t.studentId, t.centerId, req.query?.period === 'day' ? 'day' : 'month'),
);
// @MOB-031 Leaderboard: ?scope=class|center
const leaderboard = withTarget("Reytingni yuklab bo'lmadi", (t, req) =>
  learnerService.leaderboard(t.studentId, t.centerId, req.query.scope === 'center' ? 'center' : 'class'),
);

module.exports = { requireLinkedChild, listChildren, dashboard, attendance, schedule, grades, coins, payments, leaderboard, progress };

export {};
