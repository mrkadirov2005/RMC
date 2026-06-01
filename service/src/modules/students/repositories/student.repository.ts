const pool = require('../../../db/pool');

interface StudentListFilters {
  q?: string;
  school_name?: string;
  class_id?: number;
  subject_id?: number;
  level?: number;
  address?: string;
  age?: number;
  gender?: string;
  status?: string;
  page?: number;
  limit?: number;
}

const addStudentFilters = (
  conditions: string[],
  params: any[],
  filters: StudentListFilters = {},
  centerId?: number,
  teacherId?: number
) => {
  if (centerId) {
    params.push(centerId);
    conditions.push(`s.center_id = $${params.length}`);
  }

  if (teacherId) {
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }

  const search = String(filters.q || '').trim();
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(
      s.first_name ILIKE $${params.length}
      OR s.last_name ILIKE $${params.length}
      OR CONCAT_WS(' ', s.first_name, s.last_name) ILIKE $${params.length}
      OR s.enrollment_number ILIKE $${params.length}
      OR s.email ILIKE $${params.length}
      OR s.phone ILIKE $${params.length}
      OR s.parent_name ILIKE $${params.length}
      OR s.school_name ILIKE $${params.length}
      OR s.school_class ILIKE $${params.length}
    )`);
  }

  const schoolName = String(filters.school_name || '').trim();
  if (schoolName) {
    params.push(schoolName);
    conditions.push(`s.school_name = $${params.length}`);
  }

  if (filters.class_id != null) {
    if (Number(filters.class_id) === -1) {
      conditions.push('s.class_id IS NULL');
    } else {
      params.push(filters.class_id);
      conditions.push(`s.class_id = $${params.length}`);
    }
  }

  if (filters.subject_id != null) {
    params.push(filters.subject_id);
    conditions.push(`sub.subject_id = $${params.length}`);
  }

  if (filters.level != null) {
    params.push(filters.level);
    conditions.push(`c.level = $${params.length}`);
  }

  const address = String(filters.address || '').trim();
  if (address) {
    params.push(address);
    conditions.push(`ec.address = $${params.length}`);
  }

  if (filters.age != null) {
    params.push(filters.age);
    conditions.push(`DATE_PART('year', AGE(CURRENT_DATE, s.date_of_birth)) = $${params.length}`);
  }

  const gender = String(filters.gender || '').trim();
  if (gender) {
    params.push(gender);
    conditions.push(`s.gender = $${params.length}`);
  }

  const status = String(filters.status || '').trim();
  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }
};

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

const findPaginatedWithClass = async (filters: StudentListFilters = {}, centerId?: number, teacherId?: number) => {
  const fromClause = `
    FROM students s
    LEFT JOIN classes c ON s.class_id = c.class_id
    LEFT JOIN edu_centers ec ON s.center_id = ec.center_id
    LEFT JOIN subjects sub ON sub.class_id = c.class_id
  `;
  let query = `
    SELECT DISTINCT s.*, c.class_name, c.level AS class_level, ec.address AS center_address
    ${fromClause}
  `;
  let countQuery = `
    SELECT COUNT(DISTINCT s.student_id) AS total
    ${fromClause}
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  addStudentFilters(conditions, params, filters, centerId, teacherId);

  if (conditions.length > 0) {
    const where = ' WHERE ' + conditions.join(' AND ');
    query += where;
    countQuery += where;
  }

  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0]?.total || 0);

  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 20)));
  const offset = (page - 1) * limit;

  query += ' ORDER BY s.student_id DESC';
  params.push(limit);
  query += ` LIMIT $${params.length}`;
  params.push(offset);
  query += ` OFFSET $${params.length}`;

  const result = await pool.query(query, params);
  return { data: result.rows, total, page, limit };
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
    school_name,
    school_class,
    is_frozen,
  } = payload;
  const result = await pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id, school_name, school_class, is_frozen)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
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
      school_name,
      school_class,
      is_frozen ?? false,
    ]
  );
  return result.rows[0];
};

const update = async (id: number, payload: Record<string, unknown>, centerId?: number, teacherId?: number) => {
  const { first_name, last_name, username, email, phone, status, class_id, teacher_id, is_frozen, school_name, school_class } =
    payload;
  let query = `UPDATE students SET
      first_name = COALESCE($1, first_name),
      last_name = COALESCE($2, last_name),
      username = COALESCE($3, username),
      email = COALESCE($4, email),
      phone = COALESCE($5, phone),
      status = COALESCE($6, status),
      class_id = COALESCE($7, class_id),
      teacher_id = COALESCE($8, teacher_id),
      is_frozen = COALESCE($9, is_frozen),
      school_name = COALESCE($10, school_name),
      school_class = COALESCE($11, school_class),
      updated_at = CURRENT_TIMESTAMP
    WHERE student_id = $12`;
  const params: any[] = [
    first_name,
    last_name,
    username,
    email,
    phone,
    status,
    class_id,
    teacher_id,
    is_frozen,
    school_name,
    school_class,
    id,
  ];

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
    'SELECT student_id, first_name, last_name, email, password_hash, status, class_id, center_id, is_frozen FROM students WHERE username = $1',
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
  findPaginatedWithClass,
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
