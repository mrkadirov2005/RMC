const pool = require('../../../db/pool');

const findAll = (centerId?: number) => {
  let query = 'SELECT * FROM teachers';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY teacher_id';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM teachers WHERE teacher_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findByUsername = (username: string) =>
  pool
    .query(
      'SELECT teacher_id, first_name, last_name, email, password_hash, status, center_id FROM teachers WHERE username = $1',
      [username]
    )
    .then((r: any) => r.rows[0] || null);

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, roles, username, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const countByUsername = (username: string) =>
  pool.query('SELECT teacher_id FROM teachers WHERE username = $1', [username]).then((r: any) => r.rows.length);

const update = (id: number, fields: any[], centerId?: number) => {
  let query =
    'UPDATE teachers SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email), phone = COALESCE($4, phone), status = COALESCE($5, status), roles = COALESCE($6, roles), updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $7';
  const params: any[] = [...fields, id];
  if (centerId) {
    query += ' AND center_id = $8';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number) => {
  let query = 'DELETE FROM teachers WHERE teacher_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findPasswordHash = (id: number) =>
  pool.query('SELECT password_hash FROM teachers WHERE teacher_id = $1', [id]).then((r: any) => r.rows[0]?.password_hash);

const setCredentials = (id: number, username: string, password_hash: string, centerId?: number) => {
  let query =
    'UPDATE teachers SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $3';
  const params: any[] = [username, password_hash, id];
  if (centerId) {
    query += ' AND center_id = $4';
    params.push(centerId);
  }
  query += ' RETURNING teacher_id, username, email';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const updatePasswordHash = (id: number, password_hash: string) =>
  pool.query('UPDATE teachers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $2', [
    password_hash,
    id,
  ]);

module.exports = {
  findAll,
  findById,
  findByUsername,
  insert,
  countByUsername,
  update,
  remove,
  findPasswordHash,
  setCredentials,
  updatePasswordHash,
};

export {};
