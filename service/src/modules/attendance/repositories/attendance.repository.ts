const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM attendance a';
  const params: any[] = [];
  const conditions: string[] = [];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`a.teacher_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY a.attendance_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM attendance a';
  const params: any[] = [id];
  const conditions: string[] = ['a.attendance_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`a.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')}`;
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) => {
  const sessionId = params[4];
  if (sessionId) {
    return pool
      .query(
        `INSERT INTO attendance (center_id, student_id, teacher_id, class_id, session_id, attendance_date, status, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (student_id, session_id) WHERE session_id IS NOT NULL
         DO UPDATE SET
           center_id = EXCLUDED.center_id,
           teacher_id = EXCLUDED.teacher_id,
           class_id = EXCLUDED.class_id,
           attendance_date = EXCLUDED.attendance_date,
           status = EXCLUDED.status,
           remarks = EXCLUDED.remarks
         RETURNING *`,
        params
      )
      .then((r: any) => r.rows[0]);
  }

  return pool
    .query(
      `INSERT INTO attendance (center_id, student_id, teacher_id, class_id, session_id, attendance_date, status, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (student_id, class_id, attendance_date) WHERE session_id IS NULL
       DO UPDATE SET
         center_id = EXCLUDED.center_id,
         teacher_id = EXCLUDED.teacher_id,
         status = EXCLUDED.status,
         remarks = EXCLUDED.remarks
       RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);
};

const update = (id: number, params: any[], centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE attendance SET status = COALESCE($1, status), remarks = COALESCE($2, remarks) WHERE attendance_id = $3';
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
  let query = 'SELECT a.* FROM attendance a';
  const params: any[] = [studentId];
  const conditions: string[] = ['a.student_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`a.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY a.attendance_date DESC`;
  return pool.query(query, params).then((r: any) => r.rows);
};

const findByClass = (classId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM attendance a';
  const params: any[] = [classId];
  const conditions: string[] = ['a.class_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`a.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')} ORDER BY a.attendance_date DESC`;
  return pool.query(query, params).then((r: any) => r.rows);
};

const remove = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM attendance WHERE attendance_id = $1';
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

const removeByClass = (classId: number, centerId?: number) => {
  let query = 'DELETE FROM attendance WHERE class_id = $1';
  const params: any[] = [classId];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  return pool.query(query, params).then((r: any) => r.rowCount || 0);
};

const studentInCenter = async (studentId: number, centerId: number) => {
  const result = await pool.query('SELECT student_id FROM students WHERE student_id = $1 AND center_id = $2', [
    studentId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const classInCenter = async (classId: number, centerId: number) => {
  const result = await pool.query('SELECT class_id FROM classes WHERE class_id = $1 AND center_id = $2', [
    classId,
    centerId,
  ]);
  return result.rows.length > 0;
};

const findBySession = (sessionId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT a.* FROM attendance a';
  const params: any[] = [sessionId];
  const conditions: string[] = ['a.session_id = $1'];

  if (centerId) {
    query += ' JOIN classes c ON c.class_id = a.class_id';
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`a.teacher_id = $${params.length}`);
  }

  query += ` WHERE ${conditions.join(' AND ')}`;
  return pool.query(query, params).then((r: any) => r.rows);
};

module.exports = {
  findAll,
  findById,
  insert,
  update,
  findByStudent,
  findByClass,
  findBySession,
  remove,
  removeByClass,
  studentInCenter,
  classInCenter,
};

export {};
