const pool = require('../../../db/pool');
const { db, sql } = pool;

const findAll = (centerId: number) => {
  return db
    .execute(sql`
      SELECT r.*, c.class_name, c.teacher_id, c.start_date, c.end_date
      FROM rooms r
      LEFT JOIN classes c ON r.class_id = c.class_id AND c.deleted_at IS NULL
      WHERE r.center_id = ${centerId}
      ORDER BY r.room_number, r.day, r.time
    `)
    .then((r: any) => r.rows);
};

const findById = (id: number, centerId: number) => {
  return db
    .execute(sql`SELECT * FROM rooms WHERE room_id = ${id} AND center_id = ${centerId}`)
    .then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  db
    .execute(sql`
      INSERT INTO rooms (center_id, room_number, class_id, day, time, end_time)
      VALUES (${params[0]}, ${params[1]}, ${params[2]}, ${params[3]}, ${params[4]}, ${params[5]})
      RETURNING *
    `)
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId: number) => {
  return db
    .execute(sql`
      UPDATE rooms
      SET room_number = ${params[0]},
          class_id = ${params[1]},
          day = ${params[2]},
          time = ${params[3]},
          end_time = ${params[4]},
          updated_at = CURRENT_TIMESTAMP
      WHERE room_id = ${id} AND center_id = ${centerId}
      RETURNING *
    `)
    .then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId: number) => {
  return db
    .execute(sql`DELETE FROM rooms WHERE room_id = ${id} AND center_id = ${centerId} RETURNING *`)
    .then((r: any) => r.rows[0] || null);
};

const findByClassId = (classId: number, centerId: number) => {
  return db
    .execute(sql`
      SELECT r.*
      FROM rooms r
      JOIN classes c ON c.class_id = r.class_id AND c.deleted_at IS NULL
      WHERE r.class_id = ${classId} AND r.center_id = ${centerId}
      ORDER BY r.day, r.time
    `)
    .then((r: any) => r.rows);
};

const findConflict = (centerId: number, roomNumber: string, day: string, startTime: string, endTime: string, excludeRoomId?: number) => {
  if (excludeRoomId) {
    return db.execute(sql`
      SELECT room_id, room_number, class_id, day, time, end_time
      FROM rooms
      WHERE center_id = ${centerId}
        AND lower(trim(room_number)) = lower(${roomNumber.trim()})
        AND day = ${day}
        AND time < ${endTime}::time
        AND COALESCE(end_time, time + INTERVAL '1 hour') > ${startTime}::time
        AND room_id <> ${excludeRoomId}
      LIMIT 1
    `).then((r: any) => r.rows[0] || null);
  }
  return db.execute(sql`
    SELECT room_id, room_number, class_id, day, time, end_time
    FROM rooms
    WHERE center_id = ${centerId}
      AND lower(trim(room_number)) = lower(${roomNumber.trim()})
      AND day = ${day}
      AND time < ${endTime}::time
      AND COALESCE(end_time, time + INTERVAL '1 hour') > ${startTime}::time
    LIMIT 1
  `).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, insert, update, remove, findByClassId, findConflict };


export {};
