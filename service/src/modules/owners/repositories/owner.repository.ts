const pool = require('../../../db/pool');

const findAllSafe = () =>
  pool
    .query(
      `SELECT owner_id, username, email, first_name, last_name, status, last_login, created_at, updated_at
       FROM owners
       ORDER BY owner_id DESC`
    )
    .then((r: any) => r.rows);

const findById = (id: number) =>
  pool
    .query(
      `SELECT owner_id, username, email, first_name, last_name, status, last_login, created_at, updated_at
       FROM owners
       WHERE owner_id = $1`,
      [id]
    )
    .then((r: any) => r.rows[0] || null);

const countByUsername = (username: string) =>
  pool.query('SELECT owner_id FROM owners WHERE username = $1', [username]).then((r: any) => r.rows.length);

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO owners (username, email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING owner_id, username, email, first_name, last_name, status, created_at`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[]) =>
  pool
    .query(
      `UPDATE owners
       SET email = COALESCE($1, email),
           first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           status = COALESCE($4, status),
           password_hash = COALESCE($5, password_hash),
           updated_at = CURRENT_TIMESTAMP
       WHERE owner_id = $6
       RETURNING owner_id, username, email, first_name, last_name, status, updated_at`,
      [...params, id]
    )
    .then((r: any) => r.rows[0] || null);

const remove = (id: number) =>
  pool.query('DELETE FROM owners WHERE owner_id = $1 RETURNING owner_id, username, email', [id]).then((r: any) => r.rows[0] || null);

const findByUsernameForLogin = (username: string) =>
  pool
    .query(
      `SELECT owner_id, username, email, first_name, last_name, password_hash, status, is_locked
       FROM owners
       WHERE username = $1`,
      [username]
    )
    .then((r: any) => r.rows[0] || null);

const incrementLoginAttempts = (id: number) =>
  pool.query('UPDATE owners SET login_attempts = login_attempts + 1 WHERE owner_id = $1', [id]);

const resetLoginSuccess = (id: number) =>
  pool.query('UPDATE owners SET login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE owner_id = $1', [id]);

const findPasswordHash = (id: number) =>
  pool.query('SELECT password_hash FROM owners WHERE owner_id = $1', [id]).then((r: any) => r.rows[0]?.password_hash);

const updatePasswordHash = (id: number, password_hash: string) =>
  pool.query('UPDATE owners SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE owner_id = $2', [
    password_hash,
    id,
  ]);

module.exports = {
  findAllSafe,
  findById,
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
