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
      `INSERT INTO grades (
         student_id,
         teacher_id,
         subject,
         class_id,
         session_id,
         marks_obtained,
         total_marks,
         percentage,
         grade_letter,
         academic_year,
         term,
         center_id,
         attendance_score,
         homework_score,
         activity_score
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE grades SET marks_obtained = COALESCE($1, marks_obtained), percentage = COALESCE($2, percentage), grade_letter = COALESCE($3, grade_letter), attendance_score = COALESCE($4, attendance_score), homework_score = COALESCE($5, homework_score), activity_score = COALESCE($6, activity_score), updated_at = CURRENT_TIMESTAMP WHERE grade_id = $7';
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

const upsertSessionScores = (params: any[]) =>
  pool
    .query(
      `INSERT INTO grades (
         student_id,
         teacher_id,
         subject,
         class_id,
         session_id,
         total_marks,
         academic_year,
         term,
         center_id,
         attendance_score,
         homework_score,
         activity_score,
         marks_obtained,
         percentage
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
         (COALESCE($10, 0) + COALESCE($11, 0) + COALESCE($12, 0)),
         CASE
           WHEN $6 > 0 THEN
             ROUND((COALESCE($10, 0) + COALESCE($11, 0) + COALESCE($12, 0)) * 100.0 / $6, 2)
           ELSE NULL
         END
       )
       ON CONFLICT (student_id, session_id) WHERE session_id IS NOT NULL
       DO UPDATE SET
         attendance_score = COALESCE(EXCLUDED.attendance_score, grades.attendance_score),
         homework_score = COALESCE(EXCLUDED.homework_score, grades.homework_score),
         activity_score = COALESCE(EXCLUDED.activity_score, grades.activity_score),
         total_marks = COALESCE(EXCLUDED.total_marks, grades.total_marks, 100),
         subject = COALESCE(EXCLUDED.subject, grades.subject),
         teacher_id = COALESCE(EXCLUDED.teacher_id, grades.teacher_id),
         class_id = COALESCE(EXCLUDED.class_id, grades.class_id),
         academic_year = COALESCE(EXCLUDED.academic_year, grades.academic_year),
         term = COALESCE(EXCLUDED.term, grades.term),
         center_id = COALESCE(EXCLUDED.center_id, grades.center_id),
         marks_obtained = (
           COALESCE(EXCLUDED.attendance_score, grades.attendance_score, 0) +
           COALESCE(EXCLUDED.homework_score, grades.homework_score, 0) +
           COALESCE(EXCLUDED.activity_score, grades.activity_score, 0)
         ),
         percentage = CASE
           WHEN COALESCE(EXCLUDED.total_marks, grades.total_marks, 100) > 0 THEN
             ROUND(
               (
                 COALESCE(EXCLUDED.attendance_score, grades.attendance_score, 0) +
                 COALESCE(EXCLUDED.homework_score, grades.homework_score, 0) +
                 COALESCE(EXCLUDED.activity_score, grades.activity_score, 0)
               ) * 100.0 / COALESCE(EXCLUDED.total_marks, grades.total_marks, 100),
               2
             )
           ELSE NULL
         END,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

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

const findBySession = (sessionId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT g.* FROM grades g';
  const params: any[] = [sessionId];
  const conditions: string[] = ['g.session_id = $1'];

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

module.exports = { findAll, findById, insert, update, findByStudent, findBySession, remove, upsertSessionScores };

export {};
