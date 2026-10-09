const pool = require('../../../db/pool');

/** Active rooms with their capacity and opening hours. */
const findRooms = async (centerId: number) => (await pool.query(
  `SELECT physical_room_id AS room_id, name, capacity, operating_start_time::text AS opens, operating_end_time::text AS closes
   FROM physical_rooms WHERE center_id = $1 AND lower(status) = 'active' ORDER BY name`,
  [centerId]
)).rows;

/** Each weekly lesson in a room, with how many students its group has now. */
const findBookings = async (centerId: number) => (await pool.query(
  `SELECT r.physical_room_id AS room_id, lower(trim(r.day)) AS day, to_char(r.time, 'HH24:MI') AS start,
          to_char(COALESCE(r.end_time, r.time + interval '1 hour'), 'HH24:MI') AS "end",
          c.class_id, c.class_name,
          (SELECT COUNT(*) FROM students s WHERE s.class_id = c.class_id AND s.deleted_at IS NULL
             AND (s.status IS NULL OR s.status <> 'Transferred'))::int AS students
   FROM rooms r
   JOIN classes c ON c.class_id = r.class_id AND c.deleted_at IS NULL
   WHERE r.center_id = $1 AND r.physical_room_id IS NOT NULL AND r.day IS NOT NULL AND r.time IS NOT NULL`,
  [centerId]
)).rows;

module.exports = { findRooms, findBookings };
export {};
