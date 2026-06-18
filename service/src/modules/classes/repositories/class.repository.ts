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
        STRING_AGG(DISTINCT assigned_rooms.room_number, ', ' ORDER BY assigned_rooms.room_number) AS room_numbers,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'room_id', assigned_rooms.room_id,
            'room_number', assigned_rooms.room_number,
            'day', assigned_rooms.day,
            'time', assigned_rooms.time,
            'end_time', assigned_rooms.end_time,
            'slot_date', assigned_rooms.slot_date
          )
          ORDER BY assigned_rooms.day, assigned_rooms.time, assigned_rooms.room_number
        ) AS room_assignments
      FROM (
        SELECT
          r.room_id,
          r.room_number,
          r.day,
          r.time,
          r.end_time,
          NULL::TEXT AS slot_date
        FROM rooms r
        WHERE r.class_id = c.class_id
          AND r.center_id = c.center_id
        UNION
        SELECT
          r.room_id,
          r.room_number,
          TRIM(TO_CHAR(rs.slot_date, 'Day')) AS day,
          rs.start_time AS time,
          rs.end_time,
          rs.slot_date::TEXT AS slot_date
        FROM room_bookings rb
        JOIN room_slots rs ON rs.slot_id = rb.slot_id
        JOIN rooms r ON r.room_id = rs.room_id
        WHERE rb.class_id = c.class_id
          AND rb.center_id = c.center_id
      ) assigned_rooms
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
        STRING_AGG(DISTINCT assigned_rooms.room_number, ', ' ORDER BY assigned_rooms.room_number) AS room_numbers,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'room_id', assigned_rooms.room_id,
            'room_number', assigned_rooms.room_number,
            'day', assigned_rooms.day,
            'time', assigned_rooms.time,
            'end_time', assigned_rooms.end_time,
            'slot_date', assigned_rooms.slot_date
          )
          ORDER BY assigned_rooms.day, assigned_rooms.time, assigned_rooms.room_number
        ) AS room_assignments
      FROM (
        SELECT
          r.room_id,
          r.room_number,
          r.day,
          r.time,
          r.end_time,
          NULL::TEXT AS slot_date
        FROM rooms r
        WHERE r.class_id = c.class_id
          AND r.center_id = c.center_id
        UNION
        SELECT
          r.room_id,
          r.room_number,
          TRIM(TO_CHAR(rs.slot_date, 'Day')) AS day,
          rs.start_time AS time,
          rs.end_time,
          rs.slot_date::TEXT AS slot_date
        FROM room_bookings rb
        JOIN room_slots rs ON rs.slot_id = rb.slot_id
        JOIN rooms r ON r.room_id = rs.room_id
        WHERE rb.class_id = c.class_id
          AND rb.center_id = c.center_id
      ) assigned_rooms
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
