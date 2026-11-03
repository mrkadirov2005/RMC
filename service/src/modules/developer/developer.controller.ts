const developerService = require('./developer.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Developer route error:', error);
  res.status(500).json({ error: message });
};

const badType = (res: any) => res.status(400).json({ error: "Hisob turi noto'g'ri", code: 'BAD_USER_TYPE' });
const cleanReason = (value: unknown) => String(value ?? '').trim().slice(0, 500) || null;

const searchAccounts = async (req: any, res: any) => {
  try {
    const type = String(req.query.type || '');
    if (!developerService.isLockType(type)) return badType(res);
    res.json({ items: await developerService.searchAccounts(type, String(req.query.q || '')) });
  } catch (error) {
    fail(res, error, "Hisoblarni yuklab bo'lmadi");
  }
};

const listLocks = async (_req: any, res: any) => {
  try {
    res.json({ items: await developerService.listLocks(), lockdown: await developerService.getLockdown() });
  } catch (error) {
    fail(res, error, "Bloklarni yuklab bo'lmadi");
  }
};

const lockAccount = async (req: any, res: any) => {
  try {
    const type = String(req.body?.user_type || '');
    const userId = Number(req.body?.user_id);
    if (!developerService.isLockType(type)) return badType(res);
    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ error: "Hisob tanlanmagan" });
    const out = await developerService.lockAccount(type, userId, cleanReason(req.body?.reason), Number(req.user.id));
    if (out.error) return res.status(404).json({ error: 'Hisob topilmadi', code: 'NOT_FOUND' });
    res.json(out);
  } catch (error) {
    fail(res, error, "Hisobni bloklab bo'lmadi");
  }
};

const unlockAccount = async (req: any, res: any) => {
  try {
    const type = String(req.params.userType || '');
    if (!developerService.isLockType(type)) return badType(res);
    res.json(await developerService.unlockAccount(type, Number(req.params.userId)));
  } catch (error) {
    fail(res, error, "Blokni olib bo'lmadi");
  }
};

const setLockdown = async (req: any, res: any) => {
  try {
    res.json(await developerService.setLockdown(req.body?.enabled === true, cleanReason(req.body?.reason), Number(req.user.id)));
  } catch (error) {
    fail(res, error, "Tizim holatini o'zgartirib bo'lmadi");
  }
};

const listOwners = async (_req: any, res: any) => {
  try {
    res.json({ items: await developerService.listOwners() });
  } catch (error) {
    fail(res, error, "Egalarni yuklab bo'lmadi");
  }
};

const unlockOwnerPassword = async (req: any, res: any) => {
  try {
    if (!(await developerService.unlockOwnerPassword(Number(req.params.id)))) return res.status(404).json({ error: 'Ega topilmadi' });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, "Egani blokdan chiqarib bo'lmadi");
  }
};

const resetOwnerPassword = async (req: any, res: any) => {
  try {
    const password = String(req.body?.password || '');
    if (password.length < 8) return res.status(400).json({ error: "Parol kamida 8 belgidan iborat bo'lishi kerak" });
    if (!(await developerService.resetOwnerPassword(Number(req.params.id), password))) return res.status(404).json({ error: 'Ega topilmadi' });
    res.json({ ok: true });
  } catch (error) {
    fail(res, error, "Parolni o'zgartirib bo'lmadi");
  }
};

// Changes are refused while the seal is broken: signing them would also sign what was changed
// outside the app. The developer restores or accepts first.
const requireIntactSeal = async (_req: any, res: any, next: any) => {
  try {
    if (await developerService.sealIntact()) return next();
    res.status(409).json({ error: "Bloklar ilovadan tashqarida o'zgartirilgan. Avval tiklang yoki tasdiqlang.", code: 'SEAL_BROKEN' });
  } catch (error) {
    fail(res, error, "Muhrni tekshirib bo'lmadi");
  }
};

const sealStatus = async (_req: any, res: any) => {
  try {
    res.json(await developerService.sealStatus());
  } catch (error) {
    fail(res, error, "Muhrni tekshirib bo'lmadi");
  }
};

const restoreSeal = async (_req: any, res: any) => {
  try {
    const out = await developerService.restoreSeal();
    if (out.error) {
      return res.status(409).json({ error: "Muhr nusxasi buzilgan: serverda createDeveloper buyrug'ini ishga tushiring.", code: 'SEAL_NOT_AUTHENTIC' });
    }
    res.json(out);
  } catch (error) {
    fail(res, error, "Tiklab bo'lmadi");
  }
};

const acceptSeal = async (_req: any, res: any) => {
  try {
    res.json(await developerService.acceptSeal());
  } catch (error) {
    fail(res, error, "Tasdiqlab bo'lmadi");
  }
};

module.exports = {
  searchAccounts,
  listLocks,
  lockAccount,
  unlockAccount,
  setLockdown,
  listOwners,
  unlockOwnerPassword,
  resetOwnerPassword,
  requireIntactSeal,
  sealStatus,
  restoreSeal,
  acceptSeal,
};

export {};
