const settingsRepository = require('../repositories/settings.repository');
const { DEFAULT_LESSON_SCORING_SETTINGS } = require('../lessonScoringDefaults');

const LESSON_SCORING_KEY = 'lesson_scoring';
const allowedTones = new Set(['emerald', 'sky', 'violet', 'amber', 'rose', 'orange']);

const normalizeOption = (option: any, fallback: any) => ({
  label: String(option?.label || fallback.label),
  score: Number.isFinite(Number(option?.score)) ? Number(option.score) : Number(fallback.score || 0),
  symbol: String(option?.symbol || fallback.symbol || '●').slice(0, 4),
  fill: Math.max(0, Math.min(100, Number.isFinite(Number(option?.fill)) ? Number(option.fill) : Number(fallback.fill || 0))),
  tone: allowedTones.has(option?.tone) ? option.tone : fallback.tone,
});

const normalizeOptionList = (items: any, fallback: any[]) => {
  const source = Array.isArray(items) && items.length > 0 ? items : fallback;
  return source.map((item: any, index: number) => normalizeOption(item, fallback[index] || fallback[0]));
};

const normalizeCoinMapping = (items: any) => {
  const source = Array.isArray(items) && items.length > 0 ? items : DEFAULT_LESSON_SCORING_SETTINGS.coinScoreMapping;
  return source
    .map((item: any) => ({
      score: Math.max(0, Math.min(100, Number(item?.score))),
      coins: Math.round(Number(item?.coins)),
    }))
    .filter((item: any) => Number.isFinite(item.score) && Number.isFinite(item.coins))
    .sort((a: any, b: any) => b.score - a.score);
};

const normalizeLessonScoring = (settings: any = {}) => ({
  attendance: normalizeOptionList(settings.attendance, DEFAULT_LESSON_SCORING_SETTINGS.attendance),
  homework: normalizeOptionList(settings.homework, DEFAULT_LESSON_SCORING_SETTINGS.homework),
  activity: normalizeOptionList(settings.activity, DEFAULT_LESSON_SCORING_SETTINGS.activity),
  stellarBonusCoins: Math.round(Number.isFinite(Number(settings.stellarBonusCoins)) ? Number(settings.stellarBonusCoins) : DEFAULT_LESSON_SCORING_SETTINGS.stellarBonusCoins),
  coinScoreMapping: normalizeCoinMapping(settings.coinScoreMapping),
});

const getLessonScoring = async (centerId?: number) => {
  const saved = await settingsRepository.getSetting(LESSON_SCORING_KEY, centerId);
  return normalizeLessonScoring(saved || DEFAULT_LESSON_SCORING_SETTINGS);
};

const saveLessonScoring = async (settings: any, centerId?: number) => {
  const normalized = normalizeLessonScoring(settings);
  return settingsRepository.saveSetting(LESSON_SCORING_KEY, normalized, centerId);
};

const sidebarOrderKey = (userType: string, userId: number) => `sidebar_order:${userType}:${userId}`;

const getSidebarOrder = async (userType: string, userId: number) => {
  const saved = await settingsRepository.getSetting(sidebarOrderKey(userType, userId));
  return Array.isArray(saved) ? saved.filter((path: unknown) => typeof path === 'string').slice(0, 100) : [];
};

const saveSidebarOrder = async (userType: string, userId: number, order: unknown) => {
  const normalized = Array.isArray(order)
    ? Array.from(new Set(order.filter((path): path is string => typeof path === 'string' && path.startsWith('/')))).slice(0, 100)
    : [];
  return settingsRepository.saveSetting(sidebarOrderKey(userType, userId), normalized);
};

module.exports = { getLessonScoring, saveLessonScoring, normalizeLessonScoring, getSidebarOrder, saveSidebarOrder };

export {};
