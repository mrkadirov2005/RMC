const pool = require('../../../db/pool');

const ensureTable = () =>
  pool.query(`
    CREATE TABLE IF NOT EXISTS telegram_student_registrations (
      registration_id SERIAL PRIMARY KEY,
      telegram_user_id BIGINT NOT NULL,
      telegram_chat_id BIGINT NOT NULL,
      telegram_username VARCHAR(100),
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(30),
      date_of_birth DATE,
      parent_name VARCHAR(200),
      parent_phone VARCHAR(30),
      gender VARCHAR(20),
      username VARCHAR(100),
      password_hash VARCHAR(255),
      school_name VARCHAR(200),
      school_class VARCHAR(50),
      center_id INT,
      class_label VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
      status VARCHAR(30) NOT NULL DEFAULT 'Pending',
      converted_student_id INT,
      converted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE telegram_student_registrations
      ADD COLUMN IF NOT EXISTS converted_student_id INT,
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
  `);

const list = async (centerId?: number, status?: string) => {
  await ensureTable();
  const params: any[] = [];
  const conditions: string[] = [];
  if (centerId) {
    params.push(centerId);
    conditions.push(`r.center_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`r.status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT
       r.*,
       s.enrollment_number AS converted_enrollment_number,
       s.first_name AS converted_first_name,
       s.last_name AS converted_last_name
     FROM telegram_student_registrations r
     LEFT JOIN students s ON s.student_id = r.converted_student_id
     ${where}
     ORDER BY r.created_at DESC, r.registration_id DESC`,
    params
  );
  return result.rows;
};

const convertToStudent = async (id: number, centerId?: number) => {
  await ensureTable();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const params: any[] = [id];
    let query = `
      SELECT *
      FROM telegram_student_registrations
      WHERE registration_id = $1
      FOR UPDATE
    `;
    const result = await client.query(query, params);
    const registration = result.rows[0];
    if (!registration) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }
    if (centerId && Number(registration.center_id) !== Number(centerId)) {
      await client.query('ROLLBACK');
      return { error: 'not_found' as const };
    }
    if (registration.converted_student_id || String(registration.status || '').toLowerCase() === 'imported') {
      await client.query('ROLLBACK');
      return { error: 'already_imported' as const, registration };
    }

    const targetCenterId = centerId || registration.center_id;
    if (!targetCenterId) {
      await client.query('ROLLBACK');
      return { error: 'center_required' as const };
    }

    const enrollmentNumber = `TG-${String(id).padStart(6, '0')}`;
    const inserted = await client.query(
      `INSERT INTO students (
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
         is_frozen
       )
       VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8, $9, $10, $11, 'Active', NULL, NULL, $12, $13, false)
       RETURNING *`,
      [
        targetCenterId,
        enrollmentNumber,
        registration.first_name,
        registration.last_name,
        registration.username,
        registration.password_hash,
        registration.phone,
        registration.date_of_birth,
        registration.parent_name,
        registration.parent_phone,
        registration.gender,
        registration.school_name,
        registration.school_class,
      ]
    );
    const student = inserted.rows[0];

    const updated = await client.query(
      `UPDATE telegram_student_registrations
       SET status = 'Imported',
           converted_student_id = $1,
           converted_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE registration_id = $2
       RETURNING *`,
      [student.student_id, id]
    );

    await client.query('COMMIT');
    return { registration: updated.rows[0], student };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const remove = async (id: number, centerId?: number) => {
  await ensureTable();
  const params: any[] = [id];
  let query = `UPDATE telegram_student_registrations
    SET status = 'Rejected', updated_at = CURRENT_TIMESTAMP
    WHERE registration_id = $1 AND status <> 'Imported'`;
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  query += ' RETURNING *';
  const result = await pool.query(query, params);
  return result.rows[0] || null;
};

module.exports = { list, convertToStudent, remove };

export {};
