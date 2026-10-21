const smsService = require('../services/sms.service');
const smsTemplates = require('../services/smsTemplates.service');
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

// What the owner ticked for a branch admin in the access list. Teachers send missed-lesson SMS for
// their own groups without these.
const SEND_SMS = 'SEND_SMS';
const VIEW_SMS = 'VIEW_SMS';
const SMS_TABS = { messages: 'SMS_TAB_MESSAGES', templates: 'SMS_TAB_TEMPLATES' } as const;
const permissionsOf = (user: any): string[] => (Array.isArray(user?.permissions) ? user.permissions : []);

const canSendSms = (user: any) =>
  user?.userType === 'teacher' || isOwner(user) || (user?.userType === 'superuser' && permissionsOf(user).includes(SEND_SMS));

/** The SMS page tab for an admin: the page itself, and the tab (an admin with no tab ticked sees both). */
const canOpenSmsTab = (user: any, tab: keyof typeof SMS_TABS) => {
  if (isOwner(user)) return true;
  if (user?.userType !== 'superuser') return false;
  const permissions = permissionsOf(user);
  if (!permissions.includes(VIEW_SMS)) return false;
  const tabCodes = Object.values(SMS_TABS);
  return !tabCodes.some((code) => permissions.includes(code)) || permissions.includes(SMS_TABS[tab]);
};

const NO_SMS_PERMISSION = "SMS yuborishga ruxsat yo'q. Ega bu huquqni Ega panelida beradi.";

// Admin, To'lovlar page: "payment received" or "payment waiting" to the chosen students' parents.
const sendPaymentSms = async (req: any, res: any) => {
  try {
    if (req.user?.userType !== 'superuser') return res.status(403).json({ error: 'Kirish rad etildi.' });
    if (!canSendSms(req.user)) return res.status(403).json({ error: NO_SMS_PERMISSION });
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
    if (!canSendSms(req.user)) return res.status(403).json({ error: NO_SMS_PERMISSION });
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

// Owner: every message sent, with filters. An admin given the page: their own branch's only.
const listMessages = async (req: any, res: any) => {
  try {
    if (!canOpenSmsTab(req.user, 'messages')) return res.status(403).json({ error: 'Kirish rad etildi.' });
    if (isOwner(req.user)) return res.json(await smsService.listMessages(req.query || {}));
    const scope = scopeOf(req, res);
    if (!scope) return;
    if (!scope.centerId) return res.status(403).json({ error: 'Markaz tanlanishi shart.' });
    res.json(await smsService.listMessages({ ...(req.query || {}), center_id: scope.centerId }));
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

const OWNER_ONLY = 'Kirish rad etildi. Ega huquqlari talab qilinadi.';

// Owner (or an admin given the Templates tab): the wording for each SMS type, shared by all branches.
// Validation errors come back as 400 with the reason.
const ownerTemplateAction = (message: string, action: (req: any) => Promise<any>, status = 200) => async (req: any, res: any) => {
  try {
    if (!canOpenSmsTab(req.user, 'templates')) return res.status(403).json({ error: OWNER_ONLY });
    const out = await action(req);
    res.status(status).json(out ?? { ok: true });
  } catch (error: any) {
    if (error?.statusCode) return res.status(error.statusCode).json({ error: error.message });
    fail(res, error, message);
  }
};

const templateId = (req: any) => {
  const id = Number(req.params?.id);
  if (!Number.isInteger(id) || id <= 0) throw Object.assign(new Error("Shablon raqami noto'g'ri."), { statusCode: 400 });
  return id;
};

const listTemplates = ownerTemplateAction("Shablonlarni yuklab bo'lmadi", () => smsTemplates.listTemplates());
const createTemplate = ownerTemplateAction("Shablonni saqlab bo'lmadi", (req) => smsTemplates.createTemplate(req.body), 201);
const updateTemplate = ownerTemplateAction("Shablonni saqlab bo'lmadi", (req) => smsTemplates.updateTemplate(templateId(req), req.body));
const deleteTemplate = ownerTemplateAction("Shablonni o'chirib bo'lmadi", (req) => smsTemplates.deleteTemplate(templateId(req)));
const setTemplateActive = ownerTemplateAction("Shablonni o'zgartirib bo'lmadi", (req) => smsTemplates.setTemplateActive(templateId(req), req.body?.active === true));

module.exports = {
  sendPaymentSms,
  sendAttendanceSms,
  listAttendanceSent,
  getStatus,
  listMessages,
  sendTest,
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setTemplateActive,
};

export {};
