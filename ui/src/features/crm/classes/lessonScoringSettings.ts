import type { ScoreOption } from './components/SessionWorkflowScoring';

export type CoinScoreMapping = {
  score: number;
  coins: number;
};

export type LessonScoringSettings = {
  attendance: ScoreOption[];
  homework: ScoreOption[];
  activity: ScoreOption[];
  stellarBonusCoins: number;
  coinScoreMapping: CoinScoreMapping[];
};

export const defaultLessonScoringSettings: LessonScoringSettings = {
  attendance: [
    { label: 'On time', score: 50, symbol: '✓', fill: 100, tone: 'emerald' },
    { label: 'Late', score: 40, symbol: '◕', fill: 80, tone: 'amber' },
    { label: 'Excused', score: 30, symbol: '◐', fill: 60, tone: 'sky' },
    { label: 'Absent', score: 0, symbol: '○', fill: 0, tone: 'rose' },
  ],
  homework: [
    { label: 'Excellent', score: 20, symbol: '😍', fill: 100, tone: 'emerald' },
    { label: 'Good', score: 15, symbol: '🙂', fill: 75, tone: 'sky' },
    { label: 'Half', score: 10, symbol: '😐', fill: 50, tone: 'amber' },
    { label: 'Weak', score: 5, symbol: '😕', fill: 25, tone: 'orange' },
    { label: 'None', score: 0, symbol: '😞', fill: 0, tone: 'rose' },
  ],
  activity: [
    { label: 'Very active', score: 30, symbol: '★', fill: 100, tone: 'violet' },
    { label: 'Average', score: 20, symbol: '●', fill: 66, tone: 'sky' },
    { label: 'Weak', score: 10, symbol: '◔', fill: 33, tone: 'amber' },
    { label: 'No activity', score: 0, symbol: '○', fill: 0, tone: 'rose' },
  ],
  stellarBonusCoins: 30,
  coinScoreMapping: [
    { score: 100, coins: 20 },
    { score: 95, coins: 15 },
    { score: 90, coins: 10 },
    { score: 85, coins: 8 },
    { score: 80, coins: 5 },
    { score: 75, coins: 3 },
    { score: 70, coins: 1 },
    { score: 65, coins: 0 },
    { score: 60, coins: -5 },
    { score: 55, coins: -10 },
    { score: 50, coins: -15 },
    { score: 45, coins: -20 },
    { score: 0, coins: -20 },
  ],
};

const normalizeOptions = (items: unknown, fallback: ScoreOption[]) => {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  return items.map((item, index) => {
    const source = item as Partial<ScoreOption>;
    const base = fallback[index] || fallback[0];
    return {
      label: String(source.label || base.label),
      score: Number.isFinite(Number(source.score)) ? Number(source.score) : base.score,
      symbol: String(source.symbol || base.symbol),
      fill: Math.max(0, Math.min(100, Number.isFinite(Number(source.fill)) ? Number(source.fill) : base.fill)),
      tone: source.tone || base.tone,
    } as ScoreOption;
  });
};

export const normalizeLessonScoringSettings = (settings: Partial<LessonScoringSettings> | null | undefined): LessonScoringSettings => ({
  attendance: normalizeOptions(settings?.attendance, defaultLessonScoringSettings.attendance),
  homework: normalizeOptions(settings?.homework, defaultLessonScoringSettings.homework),
  activity: normalizeOptions(settings?.activity, defaultLessonScoringSettings.activity),
  stellarBonusCoins: Number.isFinite(Number(settings?.stellarBonusCoins)) ? Number(settings?.stellarBonusCoins) : defaultLessonScoringSettings.stellarBonusCoins,
  coinScoreMapping: Array.isArray(settings?.coinScoreMapping) && settings.coinScoreMapping.length > 0
    ? settings.coinScoreMapping.map((item) => ({ score: Number(item.score), coins: Number(item.coins) })).filter((item) => Number.isFinite(item.score) && Number.isFinite(item.coins))
    : defaultLessonScoringSettings.coinScoreMapping,
});
