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

// Whether the phone is connected, today's count against the limit, and this center's switches.
const getStatus = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    const [status, settings] = await Promise.all([smsService.getStatus(), smsService.getSettings(scope.centerId)]);
    res.json({ ...status, settings });
  } catch (error) {
    fail(res, error, "SMS holatini yuklab bo'lmadi");
  }
};

const saveSettings = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await smsService.saveSettings(req.body, scope.centerId));
  } catch (error) {
    fail(res, error, "SMS sozlamalarini saqlab bo'lmadi");
  }
};

const listMessages = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    res.json(await smsService.listRecent(scope.centerId));
  } catch (error) {
    fail(res, error, "SMS xabarlarini yuklab bo'lmadi");
  }
};

const sendTest = async (req: any, res: any) => {
  try {
    const scope = scopeOf(req, res);
    if (!scope) return;
    const out = await smsService.sendTest(req.body?.phone, scope.centerId, req.user);
    if (out?.error === 'not_configured') return res.status(400).json({ error: 'SMS telefoni hali ulanmagan.' });
    if (out?.error === 'invalid_phone') return res.status(400).json({ error: "Telefon raqam noto'g'ri. Masalan: +998901234567" });
    res.json(out);
  } catch (error) {
    fail(res, error, "Sinov SMS yuborib bo'lmadi");
  }
};

module.exports = { getStatus, saveSettings, listMessages, sendTest };

export {};
