const pool = require('../../../db/pool');

const findByUser = (userType: string, userId: number, centerId?: number) => {
  const params: any[] = [userType, userId];
  let query = `SELECT * FROM notifications WHERE user_type = $1 AND user_id = $2`;
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO notifications (center_id, user_type, user_id, title, message, type)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const markRead = (id: number, userType: string, userId: number, centerId?: number) => {
  const params: any[] = [id, userType, userId];
  let query = 'UPDATE notifications SET is_read = TRUE WHERE notification_id = $1 AND user_type = $2 AND user_id = $3';
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, userType: string, userId: number, centerId?: number) => {
  const params: any[] = [id, userType, userId];
  let query = 'DELETE FROM notifications WHERE notification_id = $1 AND user_type = $2 AND user_id = $3';
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findByUser, insert, markRead, remove };

export {};
