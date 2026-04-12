const pool = require('../../../db/pool');

const findAllSafe = (centerId?: number) => {
  const params: any[] = [];
  let query =
    'SELECT superuser_id, center_id, username, email, first_name, last_name, role, status, last_login, created_at, updated_at FROM superusers';

  if (centerId) {
    params.push(centerId);
    query += ' WHERE center_id = $1';
  }

  query += ' ORDER BY superuser_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  const params: any[] = [id];
  let query =
    'SELECT superuser_id, center_id, username, email, first_name, last_name, role, permissions, status, last_login, created_at, updated_at FROM superusers WHERE superuser_id = $1';

  if (centerId) {
    params.push(centerId);
    query += ' AND center_id = $2';
  }

  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const firstCenterId = () =>
  pool.query('SELECT center_id FROM edu_centers LIMIT 1').then((r: any) => r.rows[0]?.center_id);

const countByUsername = (username: string) =>
  pool.query('SELECT superuser_id FROM superusers WHERE username = $1', [username]).then((r: any) => r.rows.length);

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO superusers (center_id, username, email, password_hash, first_name, last_name, role, permissions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING superuser_id, center_id, username, email, first_name, last_name, role, status, created_at`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number) => {
  const queryParams = [...params, id];
  let query =
    `UPDATE superusers SET email = COALESCE($1, email), first_name = COALESCE($2, first_name), last_name = COALESCE($3, last_name), role = COALESCE($4, role), permissions = COALESCE($5, permissions), status = COALESCE($6, status), updated_at = CURRENT_TIMESTAMP WHERE superuser_id = $7`;

  if (centerId) {
    query += ' AND center_id = $8';
    queryParams.push(centerId);
  }

  query += '\n       RETURNING superuser_id, center_id, username, email, first_name, last_name, role, status, updated_at';
  return pool.query(query, queryParams).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number) => {
  const params: any[] = [id];
  let query = 'DELETE FROM superusers WHERE superuser_id = $1';

  if (centerId) {
    params.push(centerId);
    query += ' AND center_id = $2';
  }

  query += ' RETURNING superuser_id, username, email';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findByUsernameForLogin = (username: string) =>
  pool
    .query(
      'SELECT superuser_id, center_id, username, email, first_name, last_name, role, password_hash, status, is_locked FROM superusers WHERE username = $1',
      [username]
    )
    .then((r: any) => r.rows[0] || null);

const incrementLoginAttempts = (id: number) =>
  pool.query('UPDATE superusers SET login_attempts = login_attempts + 1 WHERE superuser_id = $1', [id]);

const resetLoginSuccess = (id: number) =>
  pool.query('UPDATE superusers SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE superuser_id = $1', [id]);

const findPasswordHash = (id: number) =>
  pool.query('SELECT password_hash FROM superusers WHERE superuser_id = $1', [id]).then((r: any) => r.rows[0]?.password_hash);

const updatePasswordHash = (id: number, password_hash: string) =>
  pool.query('UPDATE superusers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE superuser_id = $2', [
    password_hash,
    id,
  ]);

module.exports = {
  findAllSafe,
  findById,
  firstCenterId,
  countByUsername,
  insert,
  update,
  remove,
  findByUsernameForLogin,
  incrementLoginAttempts,
  resetLoginSuccess,
  findPasswordHash,
  updatePasswordHash,
};

export {};
