const pool = require('../../../db/pool');

/**
 * Every scored lesson of a group, oldest first, for the group's current students. All the group's
 * lessons count, whoever taught them. A teacher only sees a group they teach.
 */
const findClassLessonScores = async ({ classId, centerId, teacherId }: { classId: number; centerId?: number; teacherId?: number }) => {
  const result = await pool.query(
    `SELECT g.student_id, g.session_id, ses.session_date,
            g.attendance_score, g.homework_score, g.activity_score, g.points_score
     FROM grades g
     JOIN classes c ON c.class_id = g.class_id AND c.deleted_at IS NULL
     JOIN students s ON s.student_id = g.student_id AND s.deleted_at IS NULL
     LEFT JOIN sessions ses ON ses.session_id = g.session_id
     WHERE g.class_id = $1
       AND ($2::int IS NULL OR c.center_id = $2)
       AND ($3::int IS NULL OR c.teacher_id = $3)
       AND (g.attendance_score IS NOT NULL OR g.homework_score IS NOT NULL OR g.activity_score IS NOT NULL OR g.points_score IS NOT NULL)
     ORDER BY COALESCE(ses.session_date, g.created_at::date), g.session_id NULLS FIRST, g.grade_id`,
    [classId, centerId ?? null, teacherId ?? null]
  );
  return result.rows;
};

module.exports = { findClassLessonScores };
export {};
