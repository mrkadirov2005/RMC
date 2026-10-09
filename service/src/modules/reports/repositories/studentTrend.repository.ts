const pool = require('../../../db/pool');

/**
 * How many children studied on each date: a record counts from its start (or creation) until it
 * was deleted or ended (a transfer ends the old record the day before), and a child with several
 * records counts once. Transferred records from before end dates existed have no end and are left
 * out, so the child is not counted twice.
 */
const countStudentsOn = async (dates: string[], centerId?: number) => {
  const result = await pool.query(
    `SELECT d::date::text AS day, COUNT(DISTINCT COALESCE(s.main_student_id, s.student_id))::int AS students
     FROM unnest($1::date[]) AS d
     LEFT JOIN students s
       ON COALESCE(s.start_date, s.created_at::date) <= d
      AND (s.deleted_at IS NULL OR s.deleted_at::date > d)
      AND (s.end_date IS NULL OR s.end_date >= d)
      AND NOT (s.status = 'Transferred' AND s.end_date IS NULL)
      AND ($2::int IS NULL OR s.center_id = $2)
     GROUP BY d
     ORDER BY d`,
    [dates, centerId ?? null]
  );
  return result.rows;
};

module.exports = { countStudentsOn };
export {};
