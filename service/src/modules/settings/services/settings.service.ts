const settingsRepository = require('../repositories/settings.repository');
const { DEFAULT_LESSON_SCORING_SETTINGS } = require('../lessonScoringDefaults');

const LESSON_SCORING_KEY = 'lesson_scoring';
const OWNER_PALETTE_KEY = 'owner_panel_palette';
const OWNER_PALETTES: Record<string, any> = {
  ocean: { id: 'ocean', primary: '#2563eb', secondary: '#0891b2', tertiary: '#eff6ff' },
  forest: { id: 'forest', primary: '#059669', secondary: '#0d9488', tertiary: '#ecfdf5' },
  sunset: { id: 'sunset', primary: '#ea580c', secondary: '#db2777', tertiary: '#fff7ed' },
  royal: { id: 'royal', primary: '#7c3aed', secondary: '#c026d3', tertiary: '#f5f3ff' },
  slate: { id: 'slate', primary: '#334155', secondary: '#64748b', tertiary: '#f1f5f9' },
};
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

const validHex = (value: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value).toLowerCase() : fallback;
const normalizeOwnerPalette = (value: any) => {
  const preset = OWNER_PALETTES[String(value?.id || value)] || OWNER_PALETTES.ocean;
  if (!value || typeof value !== 'object') return { ...preset };
  return {
    id: OWNER_PALETTES[String(value.id)] ? String(value.id) : 'custom',
    primary: validHex(value.primary, preset.primary),
    secondary: validHex(value.secondary, preset.secondary),
    tertiary: validHex(value.tertiary, preset.tertiary),
  };
};

const getOwnerPalette = async (centerId?: number) => {
  const saved = await settingsRepository.getSetting(OWNER_PALETTE_KEY, centerId);
  return normalizeOwnerPalette(saved);
};

const saveOwnerPalette = (value: unknown, centerId?: number) =>
  settingsRepository.saveSetting(OWNER_PALETTE_KEY, normalizeOwnerPalette(value), centerId);

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

module.exports = { getLessonScoring, saveLessonScoring, normalizeLessonScoring, getOwnerPalette, saveOwnerPalette, normalizeOwnerPalette, getSidebarOrder, saveSidebarOrder };

export {};
