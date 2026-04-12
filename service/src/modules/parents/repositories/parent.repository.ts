const pool = require('../../../db/pool');

const findAllSafe = (centerId?: number) => {
  let query = `
    SELECT DISTINCT p.parent_id, p.first_name, p.last_name, p.email, p.phone, p.username, p.status, p.created_at
    FROM parents p
  `;
  const params: any[] = [];
  if (centerId) {
    query += `
      JOIN parent_students ps ON ps.parent_id = p.parent_id
      JOIN students s ON s.student_id = ps.student_id
      WHERE s.center_id = $1
    `;
    params.push(centerId);
  }
  query += ' ORDER BY p.parent_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findByIdSafe = (id: number, centerId?: number) => {
  let query = 'SELECT parent_id, first_name, last_name, email, phone, username, status, created_at FROM parents WHERE parent_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query = `
      SELECT DISTINCT p.parent_id, p.first_name, p.last_name, p.email, p.phone, p.username, p.status, p.created_at
      FROM parents p
      JOIN parent_students ps ON ps.parent_id = p.parent_id
      JOIN students s ON s.student_id = ps.student_id
      WHERE p.parent_id = $1 AND s.center_id = $2
    `;
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO parents (first_name, last_name, email, phone, username, password_hash, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING parent_id, first_name, last_name, email, phone, username, status`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number) =>
  pool
    .query(
      `UPDATE parents SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        email = COALESCE($3, email),
        phone = COALESCE($4, phone),
        status = COALESCE($5, status),
        updated_at = CURRENT_TIMESTAMP
       WHERE parent_id = $6${centerId ? ' AND parent_id IN (SELECT ps.parent_id FROM parent_students ps JOIN students s ON s.student_id = ps.student_id WHERE s.center_id = $7)' : ''} RETURNING parent_id, first_name, last_name, email, phone, username, status`,
      centerId ? [...params, id, centerId] : [...params, id]
    )
    .then((r: any) => r.rows[0] || null);

const remove = (id: number, centerId?: number) => {
  let query = 'DELETE FROM parents WHERE parent_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND parent_id IN (SELECT ps.parent_id FROM parent_students ps JOIN students s ON s.student_id = ps.student_id WHERE s.center_id = $2)';
    params.push(centerId);
  }
  query += ' RETURNING parent_id';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const upsertParentStudent = (params: any[]) =>
  pool.query(
    `INSERT INTO parent_students (parent_id, student_id, relationship, is_primary)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (parent_id, student_id) DO UPDATE SET
       relationship = EXCLUDED.relationship,
       is_primary = EXCLUDED.is_primary`,
    params
  );

const findByUsernameLogin = (username: string) =>
  pool
    .query('SELECT parent_id, first_name, last_name, email, password_hash, status FROM parents WHERE username = $1', [
      username,
    ])
    .then((r: any) => r.rows[0] || null);

const findStudentsForParent = (parentId: number) =>
  pool
    .query(
      `SELECT s.* FROM parent_students ps
       JOIN students s ON s.student_id = ps.student_id
       WHERE ps.parent_id = $1`,
      [parentId]
    )
    .then((r: any) => r.rows);

const findPaymentsForParent = (parentId: number) =>
  pool
    .query(
      `SELECT p.* FROM parent_students ps
       JOIN payments p ON p.student_id = ps.student_id
       WHERE ps.parent_id = $1
       ORDER BY p.payment_date DESC`,
      [parentId]
    )
    .then((r: any) => r.rows);

const findAttendanceForParent = (parentId: number) =>
  pool
    .query(
      `SELECT a.* FROM parent_students ps
       JOIN attendance a ON a.student_id = ps.student_id
       WHERE ps.parent_id = $1
       ORDER BY a.attendance_date DESC`,
      [parentId]
    )
    .then((r: any) => r.rows);

const findGradesForParent = (parentId: number) =>
  pool
    .query(
      `SELECT g.* FROM parent_students ps
       JOIN grades g ON g.student_id = ps.student_id
       WHERE ps.parent_id = $1
       ORDER BY g.academic_year DESC, g.term DESC`,
      [parentId]
    )
    .then((r: any) => r.rows);

const findTestSubmissionsForParent = (parentId: number) =>
  pool
    .query(
      `SELECT ts.* FROM parent_students ps
       JOIN test_submissions ts ON ts.student_id = ps.student_id
       WHERE ps.parent_id = $1
       ORDER BY ts.created_at DESC`,
      [parentId]
    )
    .then((r: any) => r.rows);

module.exports = {
  findAllSafe,
  findByIdSafe,
  insert,
  update,
  remove,
  upsertParentStudent,
  findByUsernameLogin,
  findStudentsForParent,
  findPaymentsForParent,
  findAttendanceForParent,
  findGradesForParent,
  findTestSubmissionsForParent,
};

export {};
