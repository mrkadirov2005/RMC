const pool = require('../../../db/pool');

const getAll = async (centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM assignments a';
  const params: any[] = [];
  const conditions: string[] = [];

  if (centerId || teacherId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
  }

  if (centerId) {
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`c.teacher_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY a.assignment_id DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getById = async (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM assignments a';
  const params: any[] = [id];
  const conditions: string[] = ['a.assignment_id = $1'];

  if (centerId || teacherId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
  }

  if (centerId) {
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`c.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')}`;
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const create = async (payload: any) => {
  const { class_id, assignment_title, description, due_date, submission_date, status } = payload;
  const result = await pool.query(
    `INSERT INTO assignments (class_id, assignment_title, description, due_date, submission_date, status)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [class_id, assignment_title, description, due_date, submission_date, status || 'Pending']
  );
  return result.rows[0];
};

const update = async (id: number, payload: any, centerId?: number, teacherId?: number) => {
  const { assignment_title, description, due_date, status, grade } = payload;
  let query = `UPDATE assignments SET
      assignment_title = COALESCE($1, assignment_title),
      description = COALESCE($2, description),
      due_date = COALESCE($3, due_date),
      status = COALESCE($4, status),
      grade = COALESCE($5, grade),
      updated_at = CURRENT_TIMESTAMP
    WHERE assignment_id = $6`;
  const params: any[] = [assignment_title, description, due_date, status, grade, id];
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
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM assignments WHERE assignment_id = $1';
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
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
};

export {};
