const pool = require('../../../db/pool');
const { db, sql } = pool;

const findForUser = (userType: string, userId: number, centerId?: number, entity?: string) => {
  if (centerId && entity) {
    return db.execute(sql`
      SELECT * FROM saved_filters
      WHERE user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId} AND entity = ${entity}
      ORDER BY updated_at DESC
    `).then((r: any) => r.rows);
  }
  if (centerId) {
    return db.execute(sql`
      SELECT * FROM saved_filters
      WHERE user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      ORDER BY updated_at DESC
    `).then((r: any) => r.rows);
  }
  if (entity) {
    return db.execute(sql`
      SELECT * FROM saved_filters
      WHERE user_type = ${userType} AND user_id = ${userId} AND entity = ${entity}
      ORDER BY updated_at DESC
    `).then((r: any) => r.rows);
  }
  return db.execute(sql`
    SELECT * FROM saved_filters
    WHERE user_type = ${userType} AND user_id = ${userId}
    ORDER BY updated_at DESC
  `).then((r: any) => r.rows);
};

const insert = (params: any[]) =>
  db
    .execute(sql`
      INSERT INTO saved_filters (center_id, user_type, user_id, name, entity, filters_json)
      VALUES (${params[0]}, ${params[1]}, ${params[2]}, ${params[3]}, ${params[4]}, ${params[5]})
      RETURNING *
    `)
    .then((r: any) => r.rows[0]);

const update = (id: number, userType: string, userId: number, centerId: number, name: any, filtersJson: string | null) =>
  db
    .execute(sql`
      UPDATE saved_filters SET
        name = COALESCE(${name}, name),
        filters_json = COALESCE(${filtersJson}, filters_json),
        updated_at = CURRENT_TIMESTAMP
      WHERE filter_id = ${id} AND user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      RETURNING *
    `)
    .then((r: any) => r.rows[0] || null);

const remove = (id: number, userType: string, userId: number, centerId: number) =>
  db
    .execute(sql`
      DELETE FROM saved_filters
      WHERE filter_id = ${id} AND user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      RETURNING *
    `)
    .then((r: any) => r.rows[0] || null);

module.exports = { findForUser, insert, update, remove };

export {};
