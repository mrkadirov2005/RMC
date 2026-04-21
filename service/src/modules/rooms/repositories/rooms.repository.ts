const pool = require('../../../db/pool');

const findAll = (centerId: number) => {
  return pool
    .query('SELECT r.*, c.class_name FROM rooms r LEFT JOIN classes c ON r.class_id = c.class_id WHERE r.center_id = $1 ORDER BY r.room_number, r.day, r.time', [centerId])
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
      'INSERT INTO rooms (center_id, room_number, class_id, day, time) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId: number) => {
  return pool
    .query(
      'UPDATE rooms SET room_number = $1, class_id = $2, day = $3, time = $4, updated_at = CURRENT_TIMESTAMP WHERE room_id = $5 AND center_id = $6 RETURNING *',
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
    .query('SELECT * FROM rooms WHERE class_id = $1 AND center_id = $2 ORDER BY day, time', [classId, centerId])
    .then((r: any) => r.rows);
};

module.exports = { findAll, findById, insert, update, remove, findByClassId };


export {};
