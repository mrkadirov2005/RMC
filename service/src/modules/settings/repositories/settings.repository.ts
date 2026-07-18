const pool = require('../../../db/pool');

const getSetting = (key: string, centerId?: number) => {
  const params: any[] = [key];
  let query = `
    SELECT setting_value
    FROM app_settings
    WHERE setting_key = $1
      AND center_id IS NULL
  `;

  if (centerId) {
    params.push(centerId);
    query = `
      SELECT setting_value
      FROM app_settings
      WHERE setting_key = $1
        AND (center_id = $2 OR center_id IS NULL)
      ORDER BY center_id NULLS LAST
      LIMIT 1
    `;
  }

  return pool.query(query, params).then((result: any) => result.rows[0]?.setting_value || null);
};

const saveSetting = (key: string, value: any, centerId?: number) =>
  pool
    .query(
      `INSERT INTO app_settings (center_id, setting_key, setting_value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (center_id, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
       RETURNING setting_value`,
      [centerId ?? null, key, JSON.stringify(value)]
    )
    .then((result: any) => result.rows[0]?.setting_value || null);

module.exports = { getSetting, saveSetting };

export {};
