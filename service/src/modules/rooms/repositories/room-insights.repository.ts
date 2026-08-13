const pool = require('../../../db/pool');

type Filters = { date?: string; from?: string; to?: string; roomId?: number; teacherId?: number; subjectId?: number };

const schedule = async (centerId: number, filters: Filters) => {
  const values: any[] = [centerId, filters.date || null, filters.from || null, filters.to || null,
    filters.roomId || null, filters.teacherId || null, filters.subjectId || null];
  const result = await pool.query(`
    WITH schedule_rows AS (
      SELECT r.physical_room_id, r.room_id AS assignment_id,
        COALESCE(pr.name, r.room_number) AS room_name, r.day,
        NULL::date AS schedule_date, r.time::text AS start_time,
        COALESCE(r.end_time, r.time + interval '1 hour')::time::text AS end_time,
        c.class_id, c.class_name, c.teacher_id,
        trim(concat_ws(' ', t.first_name, t.last_name)) AS teacher_name,
        s.subject_id, s.subject_name, 'recurring'::text AS source, 'confirmed'::text AS status
      FROM rooms r
      LEFT JOIN physical_rooms pr ON pr.physical_room_id = r.physical_room_id
      LEFT JOIN classes c ON c.class_id = r.class_id AND c.center_id = r.center_id AND c.deleted_at IS NULL
      LEFT JOIN teachers t ON t.teacher_id = c.teacher_id AND t.center_id = r.center_id AND t.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT subject_id, subject_name FROM subjects
        WHERE class_id = c.class_id AND center_id = r.center_id ORDER BY subject_id LIMIT 1
      ) s ON true
      WHERE r.center_id = $1
        AND ($2::date IS NULL OR lower(r.day) = lower(trim(to_char($2::date, 'Day'))))
        AND ($2::date IS NULL OR NOT EXISTS (
          SELECT 1 FROM room_bookings rb2
          JOIN room_slots rs2 ON rs2.slot_id = rb2.slot_id
          JOIN rooms r2 ON r2.room_id = rs2.room_id
          WHERE rb2.center_id = r.center_id AND rs2.slot_date = $2::date
            AND r2.physical_room_id = r.physical_room_id
            AND rs2.start_time < COALESCE(r.end_time, r.time + interval '1 hour')
            AND rs2.end_time > r.time
            AND lower(COALESCE(rb2.booking_status, 'confirmed')) <> 'cancelled'
        ))
      UNION ALL
      SELECT r.physical_room_id, r.room_id, COALESCE(pr.name, r.room_number),
        trim(to_char(rs.slot_date, 'Day')), rs.slot_date, rs.start_time::text, rs.end_time::text,
        c.class_id, c.class_name, COALESCE(rb.teacher_id, c.teacher_id),
        trim(concat_ws(' ', t.first_name, t.last_name)), s.subject_id, s.subject_name,
        'booking', lower(COALESCE(rb.booking_status, 'confirmed'))
      FROM room_bookings rb
      JOIN room_slots rs ON rs.slot_id = rb.slot_id AND rs.center_id = rb.center_id
      JOIN rooms r ON r.room_id = rs.room_id AND r.center_id = rb.center_id
      LEFT JOIN physical_rooms pr ON pr.physical_room_id = r.physical_room_id
      LEFT JOIN classes c ON c.class_id = rb.class_id AND c.center_id = rb.center_id AND c.deleted_at IS NULL
      LEFT JOIN teachers t ON t.teacher_id = COALESCE(rb.teacher_id, c.teacher_id) AND t.center_id = rb.center_id AND t.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT subject_id, subject_name FROM subjects
        WHERE class_id = c.class_id AND center_id = rb.center_id ORDER BY subject_id LIMIT 1
      ) s ON true
      WHERE rb.center_id = $1 AND lower(COALESCE(rb.booking_status, 'confirmed')) <> 'cancelled'
        AND ($2::date IS NULL OR rs.slot_date = $2::date)
    )
    SELECT * FROM schedule_rows
    WHERE ($3::date IS NULL OR schedule_date IS NULL OR schedule_date >= $3::date)
      AND ($4::date IS NULL OR schedule_date IS NULL OR schedule_date <= $4::date)
      AND ($5::int IS NULL OR physical_room_id = $5 OR assignment_id = $5)
      AND ($6::int IS NULL OR teacher_id = $6)
      AND ($7::int IS NULL OR subject_id = $7)
    ORDER BY COALESCE(schedule_date, $2::date), start_time, room_name
  `, values);
  return result.rows;
};

const physicalRooms = async (centerId: number) => (await pool.query(`
  SELECT pr.physical_room_id AS room_id, pr.name, pr.capacity, pr.location, pr.status,
    pr.features, pr.operating_start_time::text, pr.operating_end_time::text,
    array_remove(array_agg(r.room_id ORDER BY r.room_id), NULL) AS assignment_ids
  FROM physical_rooms pr LEFT JOIN rooms r ON r.physical_room_id = pr.physical_room_id
  WHERE pr.center_id = $1
    AND EXISTS (SELECT 1 FROM rooms existing_room WHERE existing_room.physical_room_id = pr.physical_room_id)
  GROUP BY pr.physical_room_id ORDER BY pr.name
`, [centerId])).rows;

const updatePhysicalRoom = async (roomId: number, centerId: number, data: any) => {
  const result = await pool.query(`
    UPDATE physical_rooms SET
      name = COALESCE($3, name), capacity = COALESCE($4, capacity),
      location = COALESCE($5, location), status = COALESCE($6, status),
      features = COALESCE($7::jsonb, features),
      operating_start_time = COALESCE($8::time, operating_start_time),
      operating_end_time = COALESCE($9::time, operating_end_time), updated_at = CURRENT_TIMESTAMP
    WHERE physical_room_id = $1 AND center_id = $2 RETURNING *
  `, [roomId, centerId, data.name || null, data.capacity ?? null, data.location ?? null,
    data.status || null, data.features == null ? null : JSON.stringify(data.features),
    data.operating_start_time || null, data.operating_end_time || null]);
  return result.rows[0] || null;
};

const deletePhysicalRoom = async (roomId: number, centerId: number) => {
  const result = await pool.query(`
    DELETE FROM physical_rooms pr
    WHERE pr.physical_room_id = $1 AND pr.center_id = $2
      AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.physical_room_id = pr.physical_room_id)
    RETURNING pr.physical_room_id AS room_id, pr.name
  `, [roomId, centerId]);
  return result.rows[0] || null;
};

const availability = async (centerId: number, date: string, start: string, end: string) =>
  (await pool.query(`
    SELECT pr.physical_room_id AS room_id, pr.name, pr.capacity, pr.location, pr.status, pr.features,
      (lower(pr.status) = 'active' AND pr.operating_start_time <= $3::time
       AND pr.operating_end_time >= $4::time AND NOT EXISTS (
        SELECT 1 FROM rooms r WHERE r.physical_room_id = pr.physical_room_id
          AND lower(r.day) = lower(trim(to_char($2::date, 'Day')))
          AND r.time < $4::time AND COALESCE(r.end_time, r.time + interval '1 hour') > $3::time
        UNION ALL
        SELECT 1 FROM room_bookings rb JOIN room_slots rs ON rs.slot_id = rb.slot_id
          JOIN rooms r ON r.room_id = rs.room_id
        WHERE r.physical_room_id = pr.physical_room_id AND rb.center_id = $1
          AND rs.slot_date = $2::date AND rs.start_time < $4::time AND rs.end_time > $3::time
          AND lower(COALESCE(rb.booking_status, 'confirmed')) <> 'cancelled'
      )) AS available
    FROM physical_rooms pr WHERE pr.center_id = $1
      AND EXISTS (SELECT 1 FROM rooms existing_room WHERE existing_room.physical_room_id = pr.physical_room_id)
    ORDER BY available DESC, pr.name
  `, [centerId, date, start, end])).rows;

const utilization = async (centerId: number, from: string, to: string) =>
  (await pool.query(`
    WITH dates AS (SELECT generate_series($2::date, $3::date, interval '1 day')::date AS day),
    recurring AS (
      SELECT pr.physical_room_id, sum(extract(epoch FROM (COALESCE(r.end_time, r.time + interval '1 hour') - r.time))/60) booked
      FROM physical_rooms pr JOIN rooms r ON r.physical_room_id = pr.physical_room_id JOIN dates d ON lower(r.day)=lower(trim(to_char(d.day,'Day')))
      WHERE pr.center_id=$1 AND NOT EXISTS (
        SELECT 1 FROM room_bookings rb2 JOIN room_slots rs2 ON rs2.slot_id=rb2.slot_id JOIN rooms r2 ON r2.room_id=rs2.room_id
        WHERE rb2.center_id=$1 AND rs2.slot_date=d.day AND r2.physical_room_id=pr.physical_room_id
          AND rs2.start_time < COALESCE(r.end_time, r.time + interval '1 hour') AND rs2.end_time > r.time
          AND lower(COALESCE(rb2.booking_status,'confirmed'))<>'cancelled'
      ) GROUP BY pr.physical_room_id
    ), booked AS (
      SELECT r.physical_room_id, sum(extract(epoch FROM (rs.end_time-rs.start_time))/60) booked
      FROM room_bookings rb JOIN room_slots rs ON rs.slot_id=rb.slot_id JOIN rooms r ON r.room_id=rs.room_id
      WHERE rb.center_id=$1 AND rs.slot_date BETWEEN $2::date AND $3::date AND lower(COALESCE(rb.booking_status,'confirmed'))<>'cancelled'
      GROUP BY r.physical_room_id
    )
    SELECT pr.physical_room_id AS room_id, pr.name,
      round((COALESCE(recurring.booked,0)+COALESCE(booked.booked,0))::numeric, 0)::int AS booked_minutes,
      (extract(epoch FROM (pr.operating_end_time-pr.operating_start_time))/60 * (($3::date-$2::date)+1))::int AS available_minutes,
      round(100*(COALESCE(recurring.booked,0)+COALESCE(booked.booked,0))/NULLIF(extract(epoch FROM (pr.operating_end_time-pr.operating_start_time))/60*(($3::date-$2::date)+1),0),1) AS utilization_percent
    FROM physical_rooms pr LEFT JOIN recurring USING(physical_room_id) LEFT JOIN booked USING(physical_room_id)
    WHERE pr.center_id=$1
      AND EXISTS (SELECT 1 FROM rooms existing_room WHERE existing_room.physical_room_id = pr.physical_room_id)
    ORDER BY utilization_percent DESC NULLS LAST, pr.name
  `, [centerId, from, to])).rows;

module.exports = { schedule, physicalRooms, updatePhysicalRoom, deletePhysicalRoom, availability, utilization };
export {};
