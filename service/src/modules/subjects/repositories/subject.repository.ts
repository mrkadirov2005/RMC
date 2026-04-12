const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = 'SELECT s.* FROM subjects s';
  const params: any[] = [];
  const conditions: string[] = [];
  if (centerId) {
    query += ' JOIN classes c ON c.class_id = s.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY s.subject_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT s.* FROM subjects s';
  const params: any[] = [id];
  const conditions: string[] = ['s.subject_id = $1'];
  if (centerId) {
    query += ' JOIN classes c ON c.class_id = s.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }
  query += ` WHERE ${conditions.join(' AND ')}`;
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findByClass = (classId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT s.* FROM subjects s';
  const params: any[] = [classId];
  const conditions: string[] = ['s.class_id = $1'];
  if (centerId) {
    query += ' JOIN classes c ON c.class_id = s.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }
  query += ` WHERE ${conditions.join(' AND ')} ORDER BY s.subject_name`;
  return pool.query(query, params).then((r: any) => r.rows);
};

const insert = (params: any[]) =>
  pool
    .query(
      'INSERT INTO subjects (class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE subjects SET subject_name = COALESCE($1, subject_name), subject_code = COALESCE($2, subject_code), teacher_id = COALESCE($3, teacher_id), total_marks = COALESCE($4, total_marks), passing_marks = COALESCE($5, passing_marks) WHERE subject_id = $6';
  const values: any[] = [...params, id];
  if (centerId || teacherId) {
    query += ' AND class_id IN (SELECT class_id FROM classes WHERE 1=1';
    if (centerId) {
      values.push(centerId);
      query += ` AND center_id = $${values.length}`;
    }
    if (teacherId) {
      values.push(teacherId);
      query += ` AND teacher_id = $${values.length}`;
    }
    query += ')';
  }
  query += ' RETURNING *';
  return pool.query(query, values).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM subjects WHERE subject_id = $1';
  const params: any[] = [id];
  if (centerId || teacherId) {
    query += ' AND class_id IN (SELECT class_id FROM classes WHERE 1=1';
    if (centerId) {
      params.push(centerId);
      query += ` AND center_id = $${params.length}`;
    }
    if (teacherId) {
      params.push(teacherId);
      query += ` AND teacher_id = $${params.length}`;
    }
    query += ')';
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, findByClass, insert, update, remove };

export {};
