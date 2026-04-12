const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number, studentId?: number) => {
  let query = 'SELECT g.* FROM grades g';
  const conditions: string[] = [];
  const params: any[] = [];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = g.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`g.teacher_id = $${params.length}`);
  }
  if (studentId) {
    params.push(studentId);
    conditions.push(`g.student_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY g.grade_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT g.* FROM grades g';
  const params: any[] = [id];
  const conditions: string[] = ['g.grade_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = g.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`g.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')}`;
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO grades (student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE grades SET marks_obtained = COALESCE($1, marks_obtained), percentage = COALESCE($2, percentage), grade_letter = COALESCE($3, grade_letter), updated_at = CURRENT_TIMESTAMP WHERE grade_id = $4';
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

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT g.* FROM grades g';
  const params: any[] = [studentId];
  const conditions: string[] = ['g.student_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = g.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`g.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY g.academic_year DESC, g.term`;
  return pool.query(query, params).then((r: any) => r.rows);
};

const remove = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM grades WHERE grade_id = $1';
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

module.exports = { findAll, findById, insert, update, findByStudent, remove };

export {};
