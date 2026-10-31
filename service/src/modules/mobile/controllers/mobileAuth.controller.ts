const mobileAuthService = require('../services/mobileAuth.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile auth error:', error);
  res.status(500).json({ error: message });
};

// @MOB-022 POST /api/mobile/v1/auth/login
const login = async (req: any, res: any) => {
  try {
    const result = await mobileAuthService.login(req.body);
    if (result.kind === 'role_required') {
      return res.status(409).json({ error: "Kim sifatida kirishni tanlang: o'quvchi yoki ota-ona.", code: 'ROLE_REQUIRED' });
    }
    if (result.kind === 'inactive') {
      return res.status(403).json({ error: 'Hisob faol emas', code: 'ACCOUNT_INACTIVE' });
    }
    if (result.kind !== 'ok') {
      return res.status(401).json({ error: "Foydalanuvchi nomi yoki parol noto'g'ri", code: 'INVALID_CREDENTIALS' });
    }
    const { kind, ...payload } = result;
    res.json(payload);
  } catch (error: any) {
    fail(res, error, "Tizimga kirib bo'lmadi");
  }
};

// @MOB-023 POST /api/mobile/v1/auth/refresh
const refresh = async (req: any, res: any) => {
  try {
    const result = await mobileAuthService.refresh(req.body.refresh_token);
    if (result.kind === 'ok') {
      const { kind, ...payload } = result;
      return res.json(payload);
    }
    const codes: Record<string, string> = {
      reused: 'REFRESH_TOKEN_REUSED',
      expired: 'REFRESH_TOKEN_EXPIRED',
      inactive: 'ACCOUNT_INACTIVE',
      invalid: 'REFRESH_TOKEN_INVALID',
    };
    res.status(401).json({ error: 'Sessiya tugadi. Iltimos, qaytadan tizimga kiring.', code: codes[result.kind] });
  } catch (error: any) {
    fail(res, error, "Sessiyani yangilab bo'lmadi");
  }
};

// @MOB-023 POST /api/mobile/v1/auth/logout
const logout = async (req: any, res: any) => {
  try {
    await mobileAuthService.logout(req.body.refresh_token);
    res.json({ message: 'Tizimdan chiqildi' });
  } catch (error: any) {
    fail(res, error, "Tizimdan chiqib bo'lmadi");
  }
};

// @MOB-023 GET /api/mobile/v1/me
const me = async (req: any, res: any) => {
  try {
    const profile = await mobileAuthService.me(req.user);
    if (!profile) return res.status(404).json({ error: 'Hisob topilmadi', code: 'ACCOUNT_NOT_FOUND' });
    res.json(profile);
  } catch (error: any) {
    fail(res, error, "Profilni yuklab bo'lmadi");
  }
};

// @MOB-023 GET /api/mobile/v1/devices
const listDevices = async (req: any, res: any) => {
  try {
    res.json({ items: await mobileAuthService.listDevices(req.user) });
  } catch (error: any) {
    fail(res, error, "Qurilmalarni yuklab bo'lmadi");
  }
};

// @MOB-023 DELETE /api/mobile/v1/devices/:sessionId
const revokeDevice = async (req: any, res: any) => {
  try {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isInteger(sessionId) || sessionId < 1) {
      return res.status(400).json({ error: "Qurilma noto'g'ri ko'rsatilgan" });
    }
    const revoked = await mobileAuthService.revokeDevice(req.user, sessionId);
    if (!revoked) return res.status(404).json({ error: 'Qurilma topilmadi' });
    res.json({ message: 'Qurilmadan chiqildi' });
  } catch (error: any) {
    fail(res, error, "Qurilmadan chiqib bo'lmadi");
  }
};

module.exports = { login, refresh, logout, me, listDevices, revokeDevice };

export {};
