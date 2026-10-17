const pool = require('../../../db/pool');

/**
 * The month's lesson marks for students still studying in the group, in scope (a center, and
 * for a teacher only their groups), with what is needed to follow up.
 */
const findMonthHomework = async ({ centerId, teacherId, monthStart, monthEnd }: { centerId?: number; teacherId?: number; monthStart: string; monthEnd: string }) => {
  const result = await pool.query(
    `SELECT s.student_id, s.first_name, s.last_name, s.phone, s.parent_name, s.parent_phone,
            c.class_id, c.class_name, c.center_id, c.teacher_id,
            NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name,
            ses.session_date::text AS session_date, g.attendance_score, g.homework_score,
            g.activity_score, g.points_score
     FROM grades g
     JOIN sessions ses ON ses.session_id = g.session_id
     JOIN classes c ON c.class_id = g.class_id AND c.deleted_at IS NULL
     JOIN students s ON s.student_id = g.student_id AND s.class_id = g.class_id
      AND s.deleted_at IS NULL AND NOT COALESCE(s.is_frozen, false) AND lower(COALESCE(s.status::text, 'Active')) = 'active'
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE ses.session_date >= $1::date AND ses.session_date < $2::date
       AND ($3::int IS NULL OR c.center_id = $3)
       AND ($4::int IS NULL OR c.teacher_id = $4)`,
    [monthStart, monthEnd, centerId ?? null, teacherId ?? null]
  );
  return result.rows;
};

module.exports = { findMonthHomework };
export {};
