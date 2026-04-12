const pool = require('../../../db/pool');

const findAllFiltered = (conditions: string[], params: any[]) => {
  let query = 'SELECT * FROM discounts';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM discounts WHERE discount_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO discounts (student_id, center_id, discount_type, value, reason, start_date, end_date, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number) =>
  pool
    .query(
      `UPDATE discounts SET
        discount_type = COALESCE($1, discount_type),
        value = COALESCE($2, value),
        reason = COALESCE($3, reason),
        start_date = COALESCE($4, start_date),
        end_date = COALESCE($5, end_date),
        active = COALESCE($6, active),
        updated_at = CURRENT_TIMESTAMP
       WHERE discount_id = $7${centerId ? ' AND center_id = $8' : ''} RETURNING *`,
      centerId ? [...params, id, centerId] : [...params, id]
    )
    .then((r: any) => r.rows[0] || null);

const remove = (id: number, centerId?: number) => {
  let query = 'DELETE FROM discounts WHERE discount_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAllFiltered, findById, insert, update, remove };

export {};
