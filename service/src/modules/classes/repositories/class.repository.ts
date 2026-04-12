const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = 'SELECT * FROM classes';
  const params: any[] = [];
  const conditions: string[] = [];
  if (centerId) {
    params.push(centerId);
    conditions.push(`center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`teacher_id = $${params.length}`);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY class_id';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT * FROM classes WHERE class_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND teacher_id = $${params.length + 1}`;
    params.push(teacherId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const teacherExists = (teacherId: number, centerId?: number) => {
  let query = 'SELECT teacher_id FROM teachers WHERE teacher_id = $1';
  const params: any[] = [teacherId];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows.length > 0);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number) => {
  let query =
    'UPDATE classes SET class_name = COALESCE($1, class_name), level = COALESCE($2, level), section = COALESCE($3, section), capacity = COALESCE($4, capacity), teacher_id = COALESCE($5, teacher_id), room_number = COALESCE($6, room_number), payment_amount = COALESCE($7, payment_amount), updated_at = CURRENT_TIMESTAMP WHERE class_id = $8';
  const values: any[] = [...params, id];
  if (centerId) {
    query += ' AND center_id = $9';
    values.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, values).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number) => {
  let query = 'DELETE FROM classes WHERE class_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, teacherExists, insert, update, remove };

export {};
