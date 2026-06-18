const pool = require('../../../db/pool');

const findAll = (centerId: number) => {
  return pool
    .query('SELECT r.*, c.class_name, c.teacher_id, c.start_date, c.end_date FROM rooms r LEFT JOIN classes c ON r.class_id = c.class_id AND c.deleted_at IS NULL WHERE r.center_id = $1 ORDER BY r.room_number, r.day, r.time', [centerId])
    .then((r: any) => r.rows);
};

const findById = (id: number, centerId: number) => {
  return pool
    .query('SELECT * FROM rooms WHERE room_id = $1 AND center_id = $2', [id, centerId])
    .then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      'INSERT INTO rooms (center_id, room_number, class_id, day, time, end_time) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId: number) => {
  return pool
    .query(
      'UPDATE rooms SET room_number = $1, class_id = $2, day = $3, time = $4, end_time = $5, updated_at = CURRENT_TIMESTAMP WHERE room_id = $6 AND center_id = $7 RETURNING *',
      [...params, id, centerId]
    )
    .then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId: number) => {
  return pool
    .query('DELETE FROM rooms WHERE room_id = $1 AND center_id = $2 RETURNING *', [id, centerId])
    .then((r: any) => r.rows[0] || null);
};

const findByClassId = (classId: number, centerId: number) => {
  return pool
    .query('SELECT r.* FROM rooms r JOIN classes c ON c.class_id = r.class_id AND c.deleted_at IS NULL WHERE r.class_id = $1 AND r.center_id = $2 ORDER BY r.day, r.time', [classId, centerId])
    .then((r: any) => r.rows);
};

const findConflict = (centerId: number, roomNumber: string, day: string, startTime: string, endTime: string, excludeRoomId?: number) => {
  const params: any[] = [centerId, roomNumber.trim(), day, startTime, endTime];
  let query = `
    SELECT room_id, room_number, class_id, day, time, end_time
    FROM rooms
    WHERE center_id = $1
      AND lower(trim(room_number)) = lower($2)
      AND day = $3
      AND time < $5::time
      AND COALESCE(end_time, time + INTERVAL '1 hour') > $4::time
  `;
  if (excludeRoomId) {
    params.push(excludeRoomId);
    query += ` AND room_id <> $${params.length}`;
  }
  query += ' LIMIT 1';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, insert, update, remove, findByClassId, findConflict };


export {};
