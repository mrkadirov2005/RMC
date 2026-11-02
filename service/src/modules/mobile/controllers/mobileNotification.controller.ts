const notificationService = require('../services/mobileNotification.service');
const { pageParams } = require('../mobileAccess');

const fail = (res: any, error: any, message: string) => {
  console.error('Mobile notification error:', error);
  res.status(500).json({ error: message });
};

// @MOB-040 PUT /devices/current/push-token  { push_token: string | null }
const savePushToken = async (req: any, res: any) => {
  try {
    const raw = req.body?.push_token;
    const token = raw == null || raw === '' ? null : String(raw);
    if (token && (token.length > 300 || !/^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token))) {
      return res.status(400).json({ error: "Push token noto'g'ri", code: 'INVALID_PUSH_TOKEN' });
    }
    const saved = await notificationService.savePushToken(req.user, token);
    if (!saved) return res.status(404).json({ error: 'Qurilma sessiyasi topilmadi', code: 'SESSION_NOT_FOUND' });
    res.json({ message: token ? 'Bildirishnomalar yoqildi' : "Bildirishnomalar o'chirildi" });
  } catch (error: any) {
    fail(res, error, "Push tokenni saqlab bo'lmadi");
  }
};

// @MOB-043 GET /notifications
const list = async (req: any, res: any) => {
  try {
    const { page, pageSize } = pageParams(req.query);
    res.json(await notificationService.inbox(req.user, page, pageSize));
  } catch (error: any) {
    fail(res, error, "Bildirishnomalarni yuklab bo'lmadi");
  }
};

// @MOB-043 POST /notifications/read  { notification_id?: number }  (no id: all)
const markRead = async (req: any, res: any) => {
  try {
    const id = req.body?.notification_id == null ? undefined : Number(req.body.notification_id);
    if (id !== undefined && (!Number.isInteger(id) || id < 1)) return res.status(400).json({ error: "Bildirishnoma noto'g'ri" });
    await notificationService.markRead(req.user, id);
    res.json({ message: "O'qildi" });
  } catch (error: any) {
    fail(res, error, "Belgilab bo'lmadi");
  }
};

// @MOB-043 GET /notification-preferences
const getPreferences = async (req: any, res: any) => {
  try {
    res.json(await notificationService.preferences(req.user));
  } catch (error: any) {
    fail(res, error, "Sozlamalarni yuklab bo'lmadi");
  }
};

// @MOB-043 PUT /notification-preferences  { category, enabled }
const setPreference = async (req: any, res: any) => {
  try {
    const { category, enabled } = req.body || {};
    if (typeof enabled !== 'boolean') return res.status(400).json({ error: "enabled true yoki false bo'lishi kerak" });
    const ok = await notificationService.setPreference(req.user, String(category), enabled);
    if (!ok) return res.status(400).json({ error: "Bunday turdagi bildirishnoma yo'q", code: 'UNKNOWN_CATEGORY' });
    res.json(await notificationService.preferences(req.user));
  } catch (error: any) {
    fail(res, error, "Sozlamani saqlab bo'lmadi");
  }
};

module.exports = { savePushToken, list, markRead, getPreferences, setPreference };

export {};
