const pool = require('../../../db/pool');

type CalendarScope = {
  teacherId?: number;
  classIds?: number[];
};

const datedSessions = async (centerId: number, from: string, to: string, scope: CalendarScope) => {
  const classIds = scope.classIds ? (scope.classIds.length ? scope.classIds : [-1]) : null;
  const result = await pool.query(`
    SELECT s.session_id, s.session_date::text AS date,
      s.start_time::text AS start_time,
      COALESCE(s.end_time, s.start_time + make_interval(mins => COALESCE(s.duration_minutes, 60)))::time::text AS end_time,
      s.duration_minutes, s.class_id, c.class_name,
      COALESCE(s.teacher_id, c.teacher_id) AS teacher_id,
      trim(concat_ws(' ', t.first_name, t.last_name)) AS teacher_name,
      subj.subject_id, subj.subject_name,
      room.physical_room_id AS room_id,
      COALESCE(room.room_name, c.room_number) AS room_name,
      COALESCE(att.marked, 0)::int AS attendance_marked,
      COALESCE(att.present, 0)::int AS present,
      COALESCE(att.absent, 0)::int AS absent,
      COALESCE(roster.student_count, 0)::int AS student_count
    FROM sessions s
    JOIN classes c ON c.class_id = s.class_id AND c.center_id = s.center_id AND c.deleted_at IS NULL
    LEFT JOIN teachers t ON t.teacher_id = COALESCE(s.teacher_id, c.teacher_id)
      AND t.center_id = s.center_id AND t.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT subject_id, subject_name FROM subjects
      WHERE class_id = c.class_id AND center_id = c.center_id
      ORDER BY subject_id LIMIT 1
    ) subj ON true
    LEFT JOIN LATERAL (
      SELECT r.physical_room_id, COALESCE(pr.name, r.room_number) AS room_name
      FROM rooms r
      LEFT JOIN physical_rooms pr ON pr.physical_room_id = r.physical_room_id AND pr.center_id = r.center_id
      WHERE r.center_id = s.center_id AND r.class_id = s.class_id
        AND lower(r.day) = lower(trim(to_char(s.session_date, 'Day')))
        AND r.time <= s.start_time
        AND COALESCE(r.end_time, r.time + interval '1 hour') >=
          COALESCE(s.end_time, s.start_time + make_interval(mins => COALESCE(s.duration_minutes, 60)))
      ORDER BY r.time DESC, r.room_id
      LIMIT 1
    ) room ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS marked,
        count(*) FILTER (WHERE lower(a.status::text) = 'present') AS present,
        count(*) FILTER (WHERE lower(a.status::text) LIKE 'absent%') AS absent
      FROM attendance a WHERE a.session_id = s.session_id
    ) att ON true
    LEFT JOIN LATERAL (
      SELECT count(*) AS student_count FROM students st
      WHERE st.class_id = c.class_id AND st.center_id = c.center_id
        AND st.deleted_at IS NULL AND lower(st.status::text) = 'active'
    ) roster ON true
    WHERE s.center_id = $1 AND s.deleted_at IS NULL
      AND s.session_date BETWEEN $2::date AND $3::date
      AND ($4::int IS NULL OR COALESCE(s.teacher_id, c.teacher_id) = $4)
      AND ($5::int[] IS NULL OR s.class_id = ANY($5::int[]))
    ORDER BY s.session_date, s.start_time, c.class_name
  `, [centerId, from, to, scope.teacherId ?? null, classIds]);
  return result.rows;
};

const resources = async (centerId: number, scope: CalendarScope) => {
  const classIds = scope.classIds ? (scope.classIds.length ? scope.classIds : [-1]) : null;
  const result = await pool.query(`
    SELECT 'teacher' AS type, teacher_id::text AS id,
      trim(concat_ws(' ', first_name, last_name)) AS name
    FROM teachers
    WHERE center_id = $1 AND deleted_at IS NULL
      AND ($2::int IS NULL OR teacher_id = $2)
      AND ($3::int[] IS NULL OR EXISTS (
        SELECT 1 FROM classes c WHERE c.teacher_id = teachers.teacher_id
          AND c.class_id = ANY($3::int[]) AND c.center_id = $1 AND c.deleted_at IS NULL
      ))
    UNION ALL
    SELECT 'class', class_id::text, class_name FROM classes
    WHERE center_id = $1 AND deleted_at IS NULL
      AND ($2::int IS NULL OR teacher_id = $2)
      AND ($3::int[] IS NULL OR class_id = ANY($3::int[]))
    UNION ALL
    SELECT 'subject', subject_id::text, subject_name FROM subjects
    WHERE center_id = $1
      AND ($2::int IS NULL OR class_id IN (
        SELECT class_id FROM classes WHERE center_id = $1 AND teacher_id = $2 AND deleted_at IS NULL
      ))
      AND ($3::int[] IS NULL OR class_id = ANY($3::int[]))
    UNION ALL
    SELECT 'room', pr.physical_room_id::text, pr.name FROM physical_rooms pr
    WHERE pr.center_id = $1 AND lower(COALESCE(pr.status, 'active')) = 'active'
      AND EXISTS (SELECT 1 FROM rooms existing_room WHERE existing_room.physical_room_id = pr.physical_room_id)
      AND (
      ($2::int IS NULL AND $3::int[] IS NULL) OR EXISTS (
        SELECT 1 FROM rooms r JOIN classes c ON c.class_id = r.class_id AND c.center_id = r.center_id
        WHERE r.physical_room_id = pr.physical_room_id AND r.center_id = $1
          AND ($2::int IS NULL OR c.teacher_id = $2)
          AND ($3::int[] IS NULL OR c.class_id = ANY($3::int[]))
      )
    )
    ORDER BY type, name
  `, [centerId, scope.teacherId ?? null, classIds]);
  return result.rows;
};

const studentClassIds = async (centerId: number, studentId: number) => {
  const result = await pool.query(`
    SELECT DISTINCT class_id FROM students
    WHERE student_id = $1 AND center_id = $2 AND deleted_at IS NULL
      AND lower(status::text) = 'active' AND class_id IS NOT NULL
  `, [studentId, centerId]);
  return result.rows.map((row: any) => Number(row.class_id));
};

const recurringDefinitions = async (centerId: number, scope: CalendarScope) => {
  const classIds = scope.classIds ? (scope.classIds.length ? scope.classIds : [-1]) : null;
  const result = await pool.query(`
    SELECT c.class_id, c.class_name, c.section, c.start_date::date::text AS active_from,
      c.end_date::date::text AS active_to, c.teacher_id,
      trim(concat_ws(' ', t.first_name, t.last_name)) AS teacher_name,
      subj.subject_id, subj.subject_name, c.room_number AS room_name
    FROM classes c
    LEFT JOIN teachers t ON t.teacher_id = c.teacher_id AND t.center_id = c.center_id AND t.deleted_at IS NULL
    LEFT JOIN LATERAL (
      SELECT subject_id, subject_name FROM subjects
      WHERE class_id = c.class_id AND center_id = c.center_id ORDER BY subject_id LIMIT 1
    ) subj ON true
    WHERE c.center_id = $1 AND c.deleted_at IS NULL AND c.section IS NOT NULL
      AND ($2::int IS NULL OR c.teacher_id = $2)
      AND ($3::int[] IS NULL OR c.class_id = ANY($3::int[]))
    ORDER BY c.class_name
  `, [centerId, scope.teacherId ?? null, classIds]);
  return result.rows;
};

const updateRecurringSchedule = async (centerId: number, classId: number, section: string, roomNumber: string) => {
  const result = await pool.query(`UPDATE classes SET section=$3, room_number=$4, updated_at=CURRENT_TIMESTAMP
    WHERE center_id=$1 AND class_id=$2 AND deleted_at IS NULL RETURNING class_id, class_name, section, room_number`,
  [centerId, classId, section, roomNumber]);
  return result.rows[0] || null;
};

module.exports = { datedSessions, resources, studentClassIds, recurringDefinitions, updateRecurringSchedule };
export {};
