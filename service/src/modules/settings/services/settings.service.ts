const settingsRepository = require('../repositories/settings.repository');
const { DEFAULT_LESSON_SCORING_SETTINGS } = require('../lessonScoringDefaults');

const LESSON_SCORING_KEY = 'lesson_scoring';
const OWNER_PALETTE_KEY = 'owner_panel_palette';
const VISUAL_OVERRIDES_KEY = 'owner_visual_overrides';
const OWNER_PALETTES: Record<string, any> = {
  ocean: { id: 'ocean', primary: '#0066ff', secondary: '#00c2ff', tertiary: '#eaf3ff' },
  forest: { id: 'forest', primary: '#00c853', secondary: '#00e5a8', tertiary: '#e8fff3' },
  sunset: { id: 'sunset', primary: '#ff5a00', secondary: '#ff1493', tertiary: '#fff0e6' },
  royal: { id: 'royal', primary: '#7a00ff', secondary: '#e000ff', tertiary: '#f4eaff' },
  slate: { id: 'slate', primary: '#364cff', secondary: '#647dff', tertiary: '#eef0ff' },
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
  if (OWNER_PALETTES[String(value.id)]) return { ...preset };
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

const normalizeVisualOverrides = (items: unknown) => Array.isArray(items)
  ? items.filter((item: any) => typeof item?.key === 'string' && item.key.length <= 300 && /^#[0-9a-f]{6}$/i.test(String(item?.color)))
      .map((item: any) => ({ key: item.key, color: String(item.color).toLowerCase() })).slice(0, 500)
  : [];
const getVisualOverrides = async (centerId?: number) => normalizeVisualOverrides(await settingsRepository.getSetting(VISUAL_OVERRIDES_KEY, centerId));
const saveVisualOverrides = (items: unknown, centerId?: number) => settingsRepository.saveSetting(VISUAL_OVERRIDES_KEY, normalizeVisualOverrides(items), centerId);

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

module.exports = { getLessonScoring, saveLessonScoring, normalizeLessonScoring, getOwnerPalette, saveOwnerPalette, normalizeOwnerPalette, getVisualOverrides, saveVisualOverrides, normalizeVisualOverrides, getSidebarOrder, saveSidebarOrder };

export {};
