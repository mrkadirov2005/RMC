const accountService = require('../services/mobileAccount.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile account error:', error);
  res.status(500).json({ error: message });
};

const ROLE_REQUIRED = { status: 409, error: "Kim sifatida tiklashni tanlang: o'quvchi yoki ota-ona.", code: 'ROLE_REQUIRED' };

// @MOB-024 POST /api/mobile/v1/auth/password-reset/request (public)
const requestPasswordReset = async (req: any, res: any) => {
  try {
    const result = await accountService.requestPasswordReset(String(req.body.username).trim(), req.body.role);
    const errors: Record<string, any> = {
      role_required: ROLE_REQUIRED,
      no_phone: { status: 422, error: "Hisobingizda telefon raqam saqlanmagan. Markaz administratoriga murojaat qiling.", code: 'NO_PHONE' },
      too_many: { status: 429, error: "Kod ko'p so'raldi. Bir soatdan keyin urinib ko'ring.", code: 'TOO_MANY_CODES' },
      sms_unavailable: { status: 503, error: "SMS hozir yuborilmayapti. Administratorga murojaat qiling.", code: 'SMS_UNAVAILABLE' },
    };
    const err = errors[result.kind];
    if (err) return res.status(err.status).json({ error: err.error, code: err.code });
    res.json({ message: 'Agar hisob mavjud bo‘lsa, kod SMS orqali yuborildi.', phone_hint: result.phone_hint });
  } catch (error: any) {
    fail(res, error, "Kodni yuborib bo'lmadi");
  }
};

// @MOB-024 POST /api/mobile/v1/auth/password-reset/confirm (public)
const confirmPasswordReset = async (req: any, res: any) => {
  try {
    const result = await accountService.confirmPasswordReset(String(req.body.username).trim(), req.body.code, req.body.new_password, req.body.role);
    if (result.kind === 'ok') return res.json({ message: "Parol yangilandi. Yangi parol bilan kiring." });
    const errors: Record<string, any> = {
      role_required: ROLE_REQUIRED,
      expired: { status: 400, error: "Kod muddati tugagan. Yangi kod so'rang.", code: 'CODE_EXPIRED' },
      too_many_attempts: { status: 429, error: "Urinishlar tugadi. Yangi kod so'rang.", code: 'TOO_MANY_ATTEMPTS' },
      invalid: { status: 400, error: "Kod noto'g'ri.", code: 'CODE_INVALID' },
    };
    const err = errors[result.kind] || errors.invalid;
    res.status(err.status).json({ error: err.error, code: err.code });
  } catch (error: any) {
    fail(res, error, "Parolni yangilab bo'lmadi");
  }
};

// @MOB-125 GET /student/id-token
const idToken = (req: any, res: any) => {
  try {
    res.json(accountService.issueIdToken(Number(req.user.id)));
  } catch (error: any) {
    fail(res, error, "ID kartani yuklab bo'lmadi");
  }
};

// @MOB-125 GET /api/mobile-staff/student-id/verify?token= (admins and teachers)
const verifyIdToken = async (req: any, res: any) => {
  try {
    const token = String(req.query?.token || '').trim();
    if (!token) return res.status(400).json({ error: 'Token kiritilmagan' });
    res.json(await accountService.verifyIdToken(token, req.user));
  } catch (error: any) {
    fail(res, error, "Tekshirib bo'lmadi");
  }
};

// @MOB-032 GET /parent/link-requests
const listLinkRequests = async (req: any, res: any) => {
  try {
    res.json({ items: await accountService.listLinkRequests(Number(req.user.id)) });
  } catch (error: any) {
    fail(res, error, "So'rovlarni yuklab bo'lmadi");
  }
};

// @MOB-032 POST /parent/link-requests { child_query }
const createLinkRequest = async (req: any, res: any) => {
  try {
    const result = await accountService.requestLink(Number(req.user.id), req.body?.child_query);
    const replies: Record<string, any> = {
      created: { status: 201, message: "So'rov yuborildi. Administrator tasdiqlagach farzandingiz ulanadi." },
      already_linked: { status: 200, message: 'Bu farzand allaqachon sizga ulangan.', code: 'ALREADY_LINKED' },
      invalid: { status: 400, error: 'Telefon raqam yoki loginni kiriting.', code: 'INVALID' },
      not_found: { status: 404, error: 'Bunday telefon raqam yoki login topilmadi.', code: 'NOT_FOUND' },
      duplicate: { status: 409, error: "Bu farzand uchun so'rov allaqachon yuborilgan.", code: 'DUPLICATE' },
      too_many: { status: 429, error: "Ko'rib chiqilayotgan so'rovlar ko'p. Administrator javobini kuting.", code: 'TOO_MANY' },
    };
    const { status, ...body } = replies[result.kind];
    res.status(status).json(body);
  } catch (error: any) {
    fail(res, error, "So'rovni yuborib bo'lmadi");
  }
};

// @MOB-166 GET /api/mobile-admin/adoption
const adoption = async (req: any, res: any) => {
  try {
    res.json(await accountService.adoption());
  } catch (error: any) {
    fail(res, error, "Statistikani yuklab bo'lmadi");
  }
};

module.exports = { requestPasswordReset, confirmPasswordReset, idToken, verifyIdToken, listLinkRequests, createLinkRequest, adoption };

export {};
