const smsService = require('../services/sms.service');
const { getScopedCenterId } = require('../../../shared/tenant');

const scopeOf = (req: any, res: any) => {
  const { centerId, isGlobal } = getScopedCenterId(req);
  if (!centerId && !isGlobal) {
    res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    return null;
  }
  return { centerId: centerId ?? undefined };
};

const fail = (res: any, error: any, message: string) => {
  console.error('SMS error:', error);
  res.status(500).json({ error: message, details: error?.message || String(error) });
};

const NOT_CONFIGURED = 'SMS telefoni hali ulanmagan.';

// Who pressed send, as shown on the owner's SMS page.
const senderNameOf = (user: any) => smsService.senderNameOf(user);

const isOwner = (user: any) => user?.userType === 'superuser' && String(user.role || '').toLowerCase() === 'owner';

// Admin, To'lovlar page: "payment received" or "payment waiting" to the chosen students' parents.
const sendPaymentSms = async (req: any, res: any) => {
  try {
    if (req.user?.userType !== 'superuser') return res.status(403).json({ error: 'Kirish rad etildi.' });
    const scope = scopeOf(req, res);
    if (!scope) return;
    const type = String(req.body?.type || '');
    const studentIds = (Array.isArray(req.body?.student_ids) ? req.body.student_ids : []).map(Number).filter((id: number) => id > 0);
    if (!['success', 'waiting'].includes(type) || studentIds.length === 0) {
      return res.status(400).json({ error: "type (success yoki waiting) va student_ids ko'rsatilishi shart." });
    }
    const out = await smsService.sendPaymentSms({
      type,
      studentIds,
      from: req.body?.from,
      to: req.body?.to,
      centerId: scope.centerId,
      actingUser: req.user,
      senderName: await senderNameOf(req.user),
    });
    if (out?.error === 'not_configured') return res.status(400).json({ error: NOT_CONFIGURED });
    res.json(out);
  } catch (error) {
    fail(res, error, "SMS yuborib bo'lmadi");
  }
};

// Teacher (own groups) or admin, warnings page: students who missed lessons in a row.
const sendAttendanceSms = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    const items = (Array.isArray(req.body?.items) ? req.body.items : [])
      .map((item: any) => ({ student_id: Number(item?.student_id), class_id: Number(item?.class_id) }))
      .filter((item: any) => item.student_id > 0 && item.class_id > 0);
    if (items.length === 0) return res.status(400).json({ error: "items (student_id, class_id) ko'rsatilishi shart." });
    const out = await smsService.sendAttendanceSms({
      items,
      centerId: scope.centerId,
      teacherId: req.user?.userType === 'teacher' ? Number(req.user.id) : undefined,
      actingUser: req.user,
      senderName: await senderNameOf(req.user),
    });
    if (out?.error === 'not_configured') return res.status(400).json({ error: NOT_CONFIGURED });
    res.json(out);
  } catch (error) {
    fail(res, error, "SMS yuborib bo'lmadi");
  }
};

// Warnings page: which students' parents were already texted about their current absences.
const listAttendanceSent = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await smsService.listAttendanceSent(scope.centerId));
  } catch (error) {
    fail(res, error, "SMS ma'lumotlarini yuklab bo'lmadi");
  }
};

// Whether the phone is connected and today's count against the limit. Teachers and admins see it
// before sending; the owner on the SMS page.
const getStatus = async (_req: any, res: any) => {
  try {
    res.json(await smsService.getStatus());
  } catch (error) {
    fail(res, error, "SMS holatini yuklab bo'lmadi");
  }
};

// Owner: every message sent, with filters.
const listMessages = async (req: any, res: any) => {
  try {
    if (!isOwner(req.user)) return res.status(403).json({ error: 'Kirish rad etildi. Ega huquqlari talab qilinadi.' });
    res.json(await smsService.listMessages(req.query || {}));
  } catch (error) {
    fail(res, error, "SMS xabarlarini yuklab bo'lmadi");
  }
};

const sendTest = async (req: any, res: any) => {
  try {
    if (!isOwner(req.user)) return res.status(403).json({ error: 'Kirish rad etildi. Ega huquqlari talab qilinadi.' });
    const out = await smsService.sendTest(req.body?.phone, undefined, req.user, await senderNameOf(req.user));
    if (out?.error === 'not_configured') return res.status(400).json({ error: NOT_CONFIGURED });
    if (out?.error === 'invalid_phone') return res.status(400).json({ error: "Telefon raqam noto'g'ri. Masalan: +998901234567" });
    res.json(out);
  } catch (error) {
    fail(res, error, "Sinov SMS yuborib bo'lmadi");
  }
};

module.exports = { sendPaymentSms, sendAttendanceSms, listAttendanceSent, getStatus, listMessages, sendTest };

export {};
