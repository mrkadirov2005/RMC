const releaseService = require('../services/mobileRelease.service');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile release error:', error);
  res.status(500).json({ error: message });
};

// @MOB-175 GET /api/mobile/v1/app-config (public): minimum and latest version, download link.
const appConfig = async (req: any, res: any) => {
  try {
    res.json(await releaseService.appConfig());
  } catch (error: any) {
    fail(res, error, "Sozlamalarni yuklab bo'lmadi");
  }
};

// @MOB-172 GET /api/mobile/v1/download (public): a stable link to the newest APK for the website,
// QR codes and messages to parents.
const download = async (req: any, res: any) => {
  try {
    const release = await releaseService.latest();
    if (!release) return res.status(404).json({ error: "Ilova hali joylanmagan" });
    res.redirect(302, release.download_url);
  } catch (error: any) {
    fail(res, error, "Havolani ochib bo'lmadi");
  }
};

// @MOB-172 GET /api/mobile-admin/releases
const list = async (req: any, res: any) => {
  try {
    res.json({ items: await releaseService.list() });
  } catch (error: any) {
    fail(res, error, "Versiyalarni yuklab bo'lmadi");
  }
};

// @MOB-172 POST /api/mobile-admin/releases
const publish = async (req: any, res: any) => {
  try {
    const result = await releaseService.publish(req.body, req.user?.username || req.user?.email || null);
    const errors: Record<string, string> = {
      bad_version: "Versiya 1.2.3 ko'rinishida bo'lishi kerak",
      bad_url: "Yuklab olish havolasi https:// bilan boshlanishi kerak",
      not_newer: `Versiya joriy versiyadan (${result.current}) yangi bo'lishi kerak`,
      bad_min_version: "Eng kichik versiya 1.2.3 ko'rinishida va yangi versiyadan katta bo'lmasligi kerak",
    };
    if (result.kind !== 'ok') return res.status(400).json({ error: errors[result.kind], code: result.kind.toUpperCase() });
    res.status(201).json(result.release);
  } catch (error: any) {
    fail(res, error, "Versiyani joylab bo'lmadi");
  }
};

module.exports = { appConfig, download, list, publish };

export {};
