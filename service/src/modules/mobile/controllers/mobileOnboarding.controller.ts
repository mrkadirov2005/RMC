const onboardingService = require('../services/mobileOnboarding.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile onboarding error:', error);
  res.status(500).json({ error: message });
};

const who = (req: any) => [req.user.userType, Number(req.user.id)] as const;

// @MOB-112 GET /onboarding
const state = async (req: any, res: any) => {
  try {
    res.json(await onboardingService.state(...who(req)));
  } catch (error: any) {
    fail(res, error, "Ma'lumotni yuklab bo'lmadi");
  }
};

// @MOB-113 POST /onboarding/telegram/check: a fresh check after the user joined the channel.
const checkTelegram = async (req: any, res: any) => {
  try {
    res.json(await onboardingService.telegramStatus(...who(req), { fresh: true }));
  } catch (error: any) {
    fail(res, error, "Telegramni tekshirib bo'lmadi");
  }
};

// @MOB-112 POST /onboarding/instagram-opened
const instagramOpened = async (req: any, res: any) => {
  try {
    await onboardingService.markInstagramOpened(...who(req));
    res.json({ ok: true });
  } catch (error: any) {
    fail(res, error, "Saqlab bo'lmadi");
  }
};

// @MOB-112 POST /onboarding/finish { skipped }
const finish = async (req: any, res: any) => {
  try {
    await onboardingService.finish(...who(req), req.body?.skipped === true);
    res.json({ ok: true });
  } catch (error: any) {
    fail(res, error, "Saqlab bo'lmadi");
  }
};

// @MOB-112 PUT /consents { student_id, kind, granted }
const answerConsent = async (req: any, res: any) => {
  try {
    const studentId = Number(req.body?.student_id);
    if (!Number.isInteger(studentId) || typeof req.body?.granted !== 'boolean') {
      return res.status(400).json({ error: "Ma'lumot noto'g'ri", code: 'INVALID' });
    }
    const result = await onboardingService.answerConsent(...who(req), studentId, String(req.body?.kind || 'video'), req.body.granted);
    const errors: Record<string, any> = {
      invalid: { status: 400, error: "Ma'lumot noto'g'ri", code: 'INVALID' },
      not_found: { status: 404, error: "O'quvchi topilmadi", code: 'NOT_FOUND' },
      parent_required: { status: 403, error: "Bu roziligini ota-onangiz beradi.", code: 'PARENT_REQUIRED' },
    };
    const err = errors[result.kind];
    if (err) return res.status(err.status).json({ error: err.error, code: err.code });
    res.json(result.consent);
  } catch (error: any) {
    fail(res, error, "Saqlab bo'lmadi");
  }
};

module.exports = { state, checkTelegram, instagramOpened, finish, answerConsent };

export {};
