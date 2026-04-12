const pool = require('../../../db/pool');

const findForUser = (userType: string, userId: number, centerId?: number, entity?: string) => {
  const params: any[] = [userType, userId];
  let query = 'SELECT * FROM saved_filters WHERE user_type = $1 AND user_id = $2';
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (entity) {
    params.push(entity);
    query += ` AND entity = $${params.length}`;
  }
  query += ' ORDER BY updated_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO saved_filters (center_id, user_type, user_id, name, entity, filters_json)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, userType: string, userId: number, centerId: number, name: any, filtersJson: string | null) =>
  pool
    .query(
      `UPDATE saved_filters SET
        name = COALESCE($1, name),
        filters_json = COALESCE($2, filters_json),
        updated_at = CURRENT_TIMESTAMP
       WHERE filter_id = $3 AND user_type = $4 AND user_id = $5 AND center_id = $6 RETURNING *`,
      [name, filtersJson, id, userType, userId, centerId]
    )
    .then((r: any) => r.rows[0] || null);

const remove = (id: number, userType: string, userId: number, centerId: number) =>
  pool
    .query('DELETE FROM saved_filters WHERE filter_id = $1 AND user_type = $2 AND user_id = $3 AND center_id = $4 RETURNING *', [
      id,
      userType,
      userId,
      centerId,
    ])
    .then((r: any) => r.rows[0] || null);

module.exports = { findForUser, insert, update, remove };

export {};
