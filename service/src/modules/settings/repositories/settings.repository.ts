const pool = require('../../../db/pool');
const { db } = pool;
const { and, eq, isNull, or, sql } = require('drizzle-orm');
const { appSettings } = require('../../../db/schema');

const getSetting = (key: string, centerId?: number) => {
  if (centerId) {
    return db
      .select({ settingValue: appSettings.settingValue })
      .from(appSettings)
      .where(and(eq(appSettings.settingKey, key), or(eq(appSettings.centerId, centerId), isNull(appSettings.centerId))))
      .orderBy(sql`${appSettings.centerId} NULLS LAST`)
      .limit(1)
      .then((rows: any[]) => rows[0]?.settingValue || null);
  }

  return db
    .select({ settingValue: appSettings.settingValue })
    .from(appSettings)
    .where(and(eq(appSettings.settingKey, key), isNull(appSettings.centerId)))
    .then((rows: any[]) => rows[0]?.settingValue || null);
};

const saveSetting = (key: string, value: any, centerId?: number) =>
  db
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
    .returning({ settingValue: appSettings.settingValue })
    .then((rows: any[]) => rows[0]?.settingValue || null);

module.exports = { getSetting, saveSetting };

export {};
