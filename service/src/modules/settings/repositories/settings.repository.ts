const pool = require('../../../db/pool');
const { db, sql } = pool;

const getSetting = (key: string, centerId?: number) => {
  if (centerId) {
    return db.execute(sql`
      SELECT setting_value
      FROM app_settings
      WHERE setting_key = ${key}
        AND (center_id = ${centerId} OR center_id IS NULL)
      ORDER BY center_id NULLS LAST
      LIMIT 1
    `).then((result: any) => result.rows[0]?.setting_value || null);
  }

  return db.execute(sql`
    SELECT setting_value
    FROM app_settings
    WHERE setting_key = ${key}
      AND center_id IS NULL
  `).then((result: any) => result.rows[0]?.setting_value || null);
};

const saveSetting = (key: string, value: any, centerId?: number) =>
  db
    .execute(sql`
      INSERT INTO app_settings (center_id, setting_key, setting_value)
       VALUES (${centerId ?? null}, ${key}, ${JSON.stringify(value)}::jsonb)
       ON CONFLICT (center_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
       RETURNING setting_value
    `)
    .then((result: any) => result.rows[0]?.setting_value || null);

module.exports = { getSetting, saveSetting };

export {};
