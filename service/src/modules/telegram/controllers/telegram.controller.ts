const telegramService = require('../services/telegram.service');
const telegramRepository = require('../repositories/telegram.repository');
const { getScopedCenterId } = require('../../../shared/tenant');
const { studentBelongsToTeacher } = require('../../../shared/tenantDb');

const scopeOf = (req: any, res: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    return null;
  }
  return { centerId: centerId ?? undefined };
};

const fail = (res: any, error: any, message: string) => {
  console.error('Telegram error:', error);
  res.status(500).json({ error: message, details: error?.message || String(error) });
};

// A teacher's feedback about one of their students, delivered to the student and their parents.
const sendFeedback = async (req: any, res: any) => {
  try {
    if (!scopeOf(req, res)) return;
    const studentId = Number(req.body?.student_id);
    if (!studentId) return res.status(400).json({ error: "student_id ko'rsatilishi shart." });
    const isTeacher = req.user?.userType === 'teacher';
    if (isTeacher && !(await studentBelongsToTeacher(studentId, req.user?.id))) {
      return res.status(403).json({ error: "O'quvchi bu o'qituvchiga tegishli emas." });
    }
    const senderName = isTeacher ? await telegramRepository.findTeacherName(Number(req.user.id)) : null;
    const out = await telegramService.sendFeedback({ studentId, text: req.body?.text, actingUser: req.user, senderName });
    if (out?.error === 'empty') return res.status(400).json({ error: "Xabar matni bo'sh." });
    if (out?.error === 'not_found') return res.status(404).json({ error: "O'quvchi topilmadi" });
    res.json(out);
  } catch (error) {
    fail(res, error, "Xabarni yuborib bo'lmadi");
  }
};

const sendPaymentReminders = async (req: any, res: any) => {
  try {
    if (!scopeOf(req, res)) return;
    const studentIds = (Array.isArray(req.body?.student_ids) ? req.body.student_ids : []).map(Number).filter((id: number) => id > 0).slice(0, 1000);
    const month = String(req.body?.month || '');
    if (studentIds.length === 0 || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ error: "student_ids va month (YYYY-MM) ko'rsatilishi shart." });
    }
    res.json(await telegramService.sendPaymentReminders({ studentIds, month, actingUser: req.user }));
  } catch (error) {
    fail(res, error, "Eslatmalarni yuborib bo'lmadi");
  }
};

// Admins see suggestions, complaints and messages to teachers for their branch; a teacher sees the
// messages sent to them.
const getInbox = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    if (req.user?.userType === 'teacher') {
      return res.json(await telegramService.listInbox({ ...scope, teacherId: Number(req.user.id), kinds: ['to_teacher'] }));
    }
    res.json(await telegramService.listInbox(scope));
  } catch (error) {
    fail(res, error, "Xabarlarni yuklab bo'lmadi");
  }
};

const markInboxRead = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    const teacherId = req.user?.userType === 'teacher' ? Number(req.user.id) : undefined;
    const row = await telegramService.markInboxRead(Number(req.params.id), { ...scope, teacherId });
    if (!row) return res.status(404).json({ error: 'Xabar topilmadi' });
    res.json(row);
  } catch (error) {
    fail(res, error, "Xabarni belgilab bo'lmadi");
  }
};

const getBotContent = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await telegramService.getBotContent(scope.centerId));
  } catch (error) {
    fail(res, error, "Bot ma'lumotlarini yuklab bo'lmadi");
  }
};

const saveBotContent = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await telegramService.saveBotContent(req.body, scope.centerId));
  } catch (error) {
    fail(res, error, "Bot ma'lumotlarini saqlab bo'lmadi");
  }
};

const getLinkStats = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await telegramService.getLinkStats(scope.centerId));
  } catch (error) {
    fail(res, error, "Statistikani yuklab bo'lmadi");
  }
};

module.exports = { sendFeedback, sendPaymentReminders, getInbox, markInboxRead, getBotContent, saveBotContent, getLinkStats };

export {};
