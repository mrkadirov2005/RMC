import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { DRIZZLE_DB } from '../../../database/database.tokens';
import { appSettings } from '../../../database/schema';

const LESSON_SCORING_KEY = 'lesson_scoring';

const DEFAULT_LESSON_SCORING_SETTINGS = {
  attendance: [
    { label: 'Present', score: 100, symbol: 'P', fill: 100, tone: 'emerald' },
    { label: 'Late', score: 70, symbol: 'L', fill: 70, tone: 'amber' },
    { label: 'Absent', score: 0, symbol: 'A', fill: 0, tone: 'rose' },
  ],
  homework: [
    { label: 'Done', score: 100, symbol: 'D', fill: 100, tone: 'emerald' },
    { label: 'Partial', score: 60, symbol: 'P', fill: 60, tone: 'amber' },
    { label: 'Missing', score: 0, symbol: 'M', fill: 0, tone: 'rose' },
  ],
  activity: [
    { label: 'Excellent', score: 100, symbol: 'E', fill: 100, tone: 'emerald' },
    { label: 'Good', score: 80, symbol: 'G', fill: 80, tone: 'sky' },
    { label: 'Quiet', score: 50, symbol: 'Q', fill: 50, tone: 'violet' },
  ],
  stellarBonusCoins: 30,
  coinScoreMapping: [
    { score: 100, coins: 100 },
    { score: 80, coins: 80 },
    { score: 60, coins: 60 },
    { score: 0, coins: 0 },
  ],
};

const allowedTones = new Set(['emerald', 'sky', 'violet', 'amber', 'rose', 'orange']);

@Injectable()
export class SettingsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: any) {}

  async getLessonScoring(centerId?: number) {
    const saved = await this.getSetting(LESSON_SCORING_KEY, centerId);
    return this.normalizeLessonScoring(saved || DEFAULT_LESSON_SCORING_SETTINGS);
  }

  async saveLessonScoring(settings: any, centerId?: number) {
    const normalized = this.normalizeLessonScoring(settings);
    return this.saveSetting(LESSON_SCORING_KEY, normalized, centerId);
  }

  normalizeLessonScoring(settings: any = {}) {
    return {
      attendance: this.normalizeOptionList(settings.attendance, DEFAULT_LESSON_SCORING_SETTINGS.attendance),
      homework: this.normalizeOptionList(settings.homework, DEFAULT_LESSON_SCORING_SETTINGS.homework),
      activity: this.normalizeOptionList(settings.activity, DEFAULT_LESSON_SCORING_SETTINGS.activity),
      stellarBonusCoins: Math.round(Number.isFinite(Number(settings.stellarBonusCoins)) ? Number(settings.stellarBonusCoins) : DEFAULT_LESSON_SCORING_SETTINGS.stellarBonusCoins),
      coinScoreMapping: this.normalizeCoinMapping(settings.coinScoreMapping),
    };
  }

  private normalizeOption(option: any, fallback: any) {
    return {
      label: String(option?.label || fallback.label),
      score: Number.isFinite(Number(option?.score)) ? Number(option.score) : Number(fallback.score || 0),
      symbol: String(option?.symbol || fallback.symbol || '*').slice(0, 4),
      fill: Math.max(0, Math.min(100, Number.isFinite(Number(option?.fill)) ? Number(option.fill) : Number(fallback.fill || 0))),
      tone: allowedTones.has(option?.tone) ? option.tone : fallback.tone,
    };
  }

  private normalizeOptionList(items: any, fallback: any[]) {
    const source = Array.isArray(items) && items.length > 0 ? items : fallback;
    return source.map((item: any, index: number) => this.normalizeOption(item, fallback[index] || fallback[0]));
  }

  private normalizeCoinMapping(items: any) {
    const source = Array.isArray(items) && items.length > 0 ? items : DEFAULT_LESSON_SCORING_SETTINGS.coinScoreMapping;
    return source
      .map((item: any) => ({
        score: Math.max(0, Math.min(100, Number(item?.score))),
        coins: Math.round(Number(item?.coins)),
      }))
      .filter((item: any) => Number.isFinite(item.score) && Number.isFinite(item.coins))
      .sort((a: any, b: any) => b.score - a.score);
  }

  private async getSetting(key: string, centerId?: number) {
    if (centerId) {
      const rows = await this.db
        .select({ settingValue: appSettings.settingValue })
        .from(appSettings)
        .where(and(eq(appSettings.settingKey, key), or(eq(appSettings.centerId, centerId), isNull(appSettings.centerId))))
        .orderBy(sql`${appSettings.centerId} NULLS LAST`)
        .limit(1);
      return rows[0]?.settingValue || null;
    }
    const rows = await this.db
      .select({ settingValue: appSettings.settingValue })
      .from(appSettings)
      .where(and(eq(appSettings.settingKey, key), isNull(appSettings.centerId)))
      .limit(1);
    return rows[0]?.settingValue || null;
  }

  private async saveSetting(key: string, value: any, centerId?: number) {
    const rows = await this.db
      .insert(appSettings)
      .values({ centerId: centerId ?? null, settingKey: key, settingValue: value })
      .onConflictDoUpdate({
        target: centerId ? [appSettings.centerId, appSettings.settingKey] : appSettings.settingKey,
        targetWhere: centerId ? undefined : isNull(appSettings.centerId),
        set: {
          settingValue: value,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning({ settingValue: appSettings.settingValue });
    return rows[0]?.settingValue || null;
  }
}
