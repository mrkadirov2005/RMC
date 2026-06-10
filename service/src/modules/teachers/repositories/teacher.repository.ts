const pool = require('../../../db/pool');

const findAll = (centerId?: number) => {
  let query = 'SELECT * FROM teachers';
  const params: any[] = [];
  const conditions = ['deleted_at IS NULL'];
  if (centerId) {
    params.push(centerId);
    conditions.push(`center_id = $${params.length}`);
  }
  query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY teacher_id';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM teachers WHERE teacher_id = $1 AND deleted_at IS NULL';
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
      'SELECT teacher_id, first_name, last_name, email, password_hash, status, center_id FROM teachers WHERE username = $1 AND deleted_at IS NULL',
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
  pool.query('SELECT teacher_id FROM teachers WHERE username = $1 AND deleted_at IS NULL', [username]).then((r: any) => r.rows.length);

const update = (id: number, fields: any[], centerId?: number) => {
  let query =
    'UPDATE teachers SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), username = COALESCE($3, username), email = COALESCE($4, email), phone = COALESCE($5, phone), status = COALESCE($6, status), roles = COALESCE($7, roles), updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $8 AND deleted_at IS NULL';
  const params: any[] = [...fields, id];
  if (centerId) {
    query += ' AND center_id = $9';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const getDeleteDependencies = async (id: number, centerId?: number) => {
  const params: any[] = [id];
  const scoped = centerId ? ' AND center_id = $2' : '';
  if (centerId) params.push(centerId);

  const [classes, students, subjects, assignments, sessions, attendance, grades] = await Promise.all([
    pool.query(`SELECT class_id, class_name, class_code FROM classes WHERE teacher_id = $1${scoped} AND deleted_at IS NULL ORDER BY class_id`, params),
    pool.query(`SELECT student_id, first_name, last_name FROM students WHERE teacher_id = $1${scoped} AND deleted_at IS NULL ORDER BY student_id`, params),
    pool.query(`SELECT subject_id, subject_name, subject_code FROM subjects WHERE teacher_id = $1${scoped} ORDER BY subject_id`, params),
    pool.query(`SELECT assignment_id, assignment_title FROM assignments WHERE teacher_id = $1 ORDER BY assignment_id`, [id]),
    pool.query(`SELECT session_id, class_id, session_date FROM sessions WHERE teacher_id = $1${scoped} AND deleted_at IS NULL ORDER BY session_id`, params),
    pool.query(`SELECT COUNT(*)::int AS count FROM attendance WHERE teacher_id = $1${scoped}`, params),
    pool.query(`SELECT COUNT(*)::int AS count FROM grades WHERE teacher_id = $1${scoped}`, params),
  ]);

  return {
    classes: classes.rows,
    students: students.rows,
    subjects: subjects.rows,
    assignments: assignments.rows,
    sessions: sessions.rows,
    attendance_count: Number(attendance.rows[0]?.count || 0),
    grades_count: Number(grades.rows[0]?.count || 0),
  };
};

const hasDeleteDependencies = (dependencies: any) =>
  dependencies.classes.length > 0 ||
  dependencies.students.length > 0 ||
  dependencies.subjects.length > 0 ||
  dependencies.assignments.length > 0 ||
  dependencies.sessions.length > 0 ||
  dependencies.attendance_count > 0 ||
  dependencies.grades_count > 0;

const unassignDeleteDependencies = async (id: number, centerId?: number) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const params: any[] = [id];
    const scoped = centerId ? ' AND center_id = $2' : '';
    if (centerId) params.push(centerId);

    await client.query(`UPDATE students SET teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1${scoped} AND deleted_at IS NULL`, params);
    await client.query(`UPDATE classes SET teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1${scoped} AND deleted_at IS NULL`, params);
    await client.query(`UPDATE subjects SET teacher_id = NULL WHERE teacher_id = $1${scoped}`, params);
    await client.query('UPDATE assignments SET teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1', [id]);
    await client.query(`UPDATE sessions SET teacher_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $1${scoped} AND deleted_at IS NULL`, params);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const remove = (id: number, centerId?: number) => {
  let query = `UPDATE teachers
    SET deleted_at = CURRENT_TIMESTAMP,
        status = 'Retired',
        updated_at = CURRENT_TIMESTAMP
    WHERE teacher_id = $1 AND deleted_at IS NULL`;
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const purge = (id: number, centerId?: number) => {
  let query = 'DELETE FROM teachers WHERE teacher_id = $1 AND deleted_at IS NOT NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findPasswordHash = (id: number) =>
  pool.query('SELECT password_hash FROM teachers WHERE teacher_id = $1 AND deleted_at IS NULL', [id]).then((r: any) => r.rows[0]?.password_hash);

const setCredentials = (id: number, username: string, password_hash: string, centerId?: number) => {
  let query =
    'UPDATE teachers SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $3 AND deleted_at IS NULL';
  const params: any[] = [username, password_hash, id];
  if (centerId) {
    query += ' AND center_id = $4';
    params.push(centerId);
  }
  query += ' RETURNING teacher_id, username, email';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const updatePasswordHash = (id: number, password_hash: string) =>
  pool.query('UPDATE teachers SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = $2 AND deleted_at IS NULL', [
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
  getDeleteDependencies,
  hasDeleteDependencies,
  unassignDeleteDependencies,
  remove,
  purge,
  findPasswordHash,
  setCredentials,
  updatePasswordHash,
};

export {};
