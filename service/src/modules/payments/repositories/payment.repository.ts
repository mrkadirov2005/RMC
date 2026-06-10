const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = 'SELECT p.* FROM payments p';
  const params: any[] = [];
  const conditions: string[] = [];

  if (teacherId) {
    query += ' JOIN students s ON s.student_id = p.student_id AND s.deleted_at IS NULL';
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }
  if (centerId) {
    params.push(centerId);
    conditions.push(`p.center_id = $${params.length}`);
  }
  conditions.push('p.deleted_at IS NULL');

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY p.payment_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT p.* FROM payments p WHERE p.payment_id = $1 AND p.deleted_at IS NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND p.center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND p.student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1} AND deleted_at IS NULL)`;
    params.push(teacherId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE payments SET amount = COALESCE($1, amount), payment_status = COALESCE($2, payment_status), notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP WHERE payment_id = $4 AND deleted_at IS NULL';
  const values: any[] = [...params, id];
  if (centerId) {
    query += ' AND center_id = $5';
    values.push(centerId);
  }
  if (teacherId) {
    query += ` AND student_id IN (SELECT student_id FROM students WHERE teacher_id = $${values.length + 1} AND deleted_at IS NULL)`;
    values.push(teacherId);
  }
  query += ' RETURNING *';
  return pool.query(query, values).then((r: any) => r.rows[0] || null);
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT p.* FROM payments p WHERE p.student_id = $1 AND p.deleted_at IS NULL';
  const params: any[] = [studentId];
  if (centerId) {
    query += ' AND p.center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND p.student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1} AND deleted_at IS NULL)`;
    params.push(teacherId);
  }
  query += ' ORDER BY payment_date DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const remove = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'UPDATE payments SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE payment_id = $1 AND deleted_at IS NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1} AND deleted_at IS NULL)`;
    params.push(teacherId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const purge = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM payments WHERE payment_id = $1 AND deleted_at IS NOT NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1} AND deleted_at IS NULL)`;
    params.push(teacherId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, insert, update, findByStudent, remove, purge };

export {};
