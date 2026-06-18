const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = `
    SELECT
      c.*,
      COALESCE(NULLIF(c.room_number, ''), rooms.room_numbers) AS room_number,
      rooms.room_assignments
    FROM classes c
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(DISTINCT r.room_number, ', ' ORDER BY r.room_number) AS room_numbers,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'room_id', r.room_id,
            'room_number', r.room_number,
            'day', r.day,
            'time', r.time,
            'end_time', r.end_time
          )
          ORDER BY r.day, r.time, r.room_number
        ) AS room_assignments
      FROM rooms r
      WHERE r.class_id = c.class_id
        AND r.center_id = c.center_id
    ) rooms ON TRUE
  `;
  const params: any[] = [];
  const conditions: string[] = ['c.deleted_at IS NULL'];
  if (centerId) {
    params.push(centerId);
    conditions.push(`c.center_id = $${params.length}`);
  }
  if (teacherId) {
    params.push(teacherId);
    conditions.push(`c.teacher_id = $${params.length}`);
  }
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY c.class_id';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = `
    SELECT
      c.*,
      COALESCE(NULLIF(c.room_number, ''), rooms.room_numbers) AS room_number,
      rooms.room_assignments
    FROM classes c
    LEFT JOIN LATERAL (
      SELECT
        STRING_AGG(DISTINCT r.room_number, ', ' ORDER BY r.room_number) AS room_numbers,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'room_id', r.room_id,
            'room_number', r.room_number,
            'day', r.day,
            'time', r.time,
            'end_time', r.end_time
          )
          ORDER BY r.day, r.time, r.room_number
        ) AS room_assignments
      FROM rooms r
      WHERE r.class_id = c.class_id
        AND r.center_id = c.center_id
    ) rooms ON TRUE
    WHERE c.class_id = $1 AND c.deleted_at IS NULL
  `;
  const params: any[] = [id];
  if (centerId) {
    query += ' AND c.center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND c.teacher_id = $${params.length + 1}`;
    params.push(teacherId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const teacherExists = (teacherId: number, centerId?: number) => {
  let query = 'SELECT teacher_id FROM teachers WHERE teacher_id = $1 AND deleted_at IS NULL';
  const params: any[] = [teacherId];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows.length > 0);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, start_date, end_date, payment_amount, payment_frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number) => {
  let query =
    'UPDATE classes SET class_name = COALESCE($1, class_name), class_code = COALESCE($2, class_code), level = COALESCE($3, level), section = COALESCE($4, section), capacity = COALESCE($5, capacity), teacher_id = COALESCE($6, teacher_id), room_number = COALESCE($7, room_number), start_date = $8, end_date = $9, payment_amount = COALESCE($10, payment_amount), updated_at = CURRENT_TIMESTAMP WHERE class_id = $11 AND deleted_at IS NULL';
  const values: any[] = [...params, id];
  if (centerId) {
    query += ' AND center_id = $12';
    values.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, values).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number) => {
  let query = 'UPDATE classes SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE class_id = $1 AND deleted_at IS NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const purge = (id: number, centerId?: number) => {
  let query = 'DELETE FROM classes WHERE class_id = $1 AND deleted_at IS NOT NULL';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, teacherExists, insert, update, remove, purge };

export {};
