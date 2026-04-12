const pool = require('../../../db/pool');

const findAllWithClass = async (centerId?: number, teacherId?: number) => {
  let query = `
    SELECT s.*, c.class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (centerId) {
    params.push(centerId);
    conditions.push(`s.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY s.student_id';

  const result = await pool.query(query, params);
  return result.rows;
};

const findByIdWithClass = async (id: number, centerId?: number, teacherId?: number) => {
  let query = `
    SELECT s.*, c.class_name
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    WHERE s.student_id = $1
  `;
  const params: any[] = [id];

  if (centerId) {
    query += ' AND s.center_id = $2';
    params.push(centerId);
  }

  if (teacherId) {
    query += ` AND s.teacher_id = $${params.length + 1}`;
    params.push(teacherId);
  }

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const insert = async (payload: Record<string, unknown>) => {
  const {
    center_id,
    enrollment_number,
    first_name,
    last_name,
    username,
    password_hash,
    email,
    phone,
    date_of_birth,
    parent_name,
    parent_phone,
    gender,
    status,
    teacher_id,
    class_id,
  } = payload;
  const result = await pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
    [
      center_id,
      enrollment_number,
      first_name,
      last_name,
      username,
      password_hash,
      email,
      phone,
      date_of_birth,
      parent_name,
      parent_phone,
      gender,
      status || 'Active',
      teacher_id,
      class_id,
    ]
  );
  return result.rows[0];
};

const update = async (id: number, payload: Record<string, unknown>, centerId?: number, teacherId?: number) => {
  const { first_name, last_name, email, phone, status, class_id } = payload;
  let query = `UPDATE students SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      email = COALESCE($3, email),
      phone = COALESCE($4, phone),
      status = COALESCE($5, status),
      class_id = COALESCE($6, class_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE student_id = $7`;
  const params: any[] = [first_name, last_name, email, phone, status, class_id, id];

  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }

  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }

  query += ' RETURNING *';

  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const remove = async (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM students WHERE student_id = $1';
  const params: any[] = [id];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

const findByUsername = async (username: string) => {
  const result = await pool.query(
    'SELECT student_id, first_name, last_name, email, password_hash, status, class_id, center_id FROM students WHERE username = $1',
    [username]
  );
  return result.rows[0] || null;
};

const findPasswordHashById = async (id: number) => {
  const result = await pool.query('SELECT password_hash FROM students WHERE student_id = $1', [id]);
  return result.rows[0]?.password_hash ?? null;
};

const setCredentials = async (
  id: number,
  username: string,
  password_hash: string,
  centerId?: number,
  teacherId?: number
) => {
  let query =
    'UPDATE students SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE student_id = $3';
  const params: any[] = [username, password_hash, id];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (teacherId) {
    params.push(teacherId);
    query += ` AND teacher_id = $${params.length}`;
  }
  query += ' RETURNING student_id, username, email';
  const result = await pool.query(
    query,
    params
  );
  return result.rows[0] || null;
};

const updatePasswordHash = async (id: number, password_hash: string) => {
  await pool.query('UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2', [
    password_hash,
    id,
  ]);
};

module.exports = {
  findAllWithClass,
  findByIdWithClass,
  insert,
  update,
  remove,
  findByUsername,
  findPasswordHashById,
  setCredentials,
  updatePasswordHash,
};

export {};
