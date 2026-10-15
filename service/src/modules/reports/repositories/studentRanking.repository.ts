const pool = require('../../../db/pool');

/** Every lesson score of the month with the child (main record), their group and its level. */
const findMonthLessonScores = async ({ centerId, monthStart, monthEnd }: { centerId?: number; monthStart: string; monthEnd: string }) => {
  const result = await pool.query(
    `SELECT COALESCE(s.main_student_id, s.student_id) AS student_id, s.first_name, s.last_name,
            g.center_id, g.class_id, c.class_name, c.level,
            g.attendance_score, g.homework_score, g.activity_score, g.points_score
     FROM grades g
     JOIN students s ON s.student_id = g.student_id AND s.deleted_at IS NULL
     JOIN sessions ses ON ses.session_id = g.session_id
     JOIN classes c ON c.class_id = g.class_id
     WHERE ses.session_date >= $1::date AND ses.session_date < $2::date
       AND ($3::int IS NULL OR g.center_id = $3)`,
    [monthStart, monthEnd, centerId ?? null]
  );
  return result.rows;
};

module.exports = { findMonthLessonScores };
export {};
