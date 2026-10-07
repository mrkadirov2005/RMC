const pool = require('../../../db/pool');

// Recent attendance is enough to find a run of missed lessons; older records cannot be part of
// a run that is still open.
const LOOKBACK_DAYS = 120;

/** Attendance for the groups in scope (a center, and for a teacher only their groups). */
const findRecentAttendance = async ({ centerId, teacherId }: { centerId?: number; teacherId?: number }) => {
  const result = await pool.query(
    `SELECT a.student_id, a.class_id, a.attendance_date::text AS attendance_date, a.status, a.remarks
     FROM attendance a
     JOIN classes c ON c.class_id = a.class_id AND c.deleted_at IS NULL
     WHERE a.attendance_date >= CURRENT_DATE - $3::int
       AND ($1::int IS NULL OR c.center_id = $1)
       AND ($2::int IS NULL OR c.teacher_id = $2)`,
    [centerId ?? null, teacherId ?? null, LOOKBACK_DAYS]
  );
  return result.rows;
};

const findResolutions = async (studentIds: number[]) => {
  if (studentIds.length === 0) return [];
  const result = await pool.query(
    `SELECT student_id, class_id, resolved_through::text AS resolved_through
     FROM absence_alert_resolutions WHERE student_id = ANY($1::int[])`,
    [studentIds]
  );
  return result.rows;
};

/** The students and their current group, with what an admin needs to follow up. */
const findStudentDetails = async (studentIds: number[]) => {
  if (studentIds.length === 0) return [];
  const result = await pool.query(
    `SELECT s.student_id, s.first_name, s.last_name, s.phone, s.parent_name, s.parent_phone,
            s.class_id, s.center_id, s.status, COALESCE(s.is_frozen, false) AS is_frozen,
            s.deleted_at IS NOT NULL AS is_deleted,
            c.class_name, c.teacher_id,
            NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE s.student_id = ANY($1::int[])`,
    [studentIds]
  );
  return result.rows;
};

const insertResolution = async (row: {
  centerId: number | null;
  studentId: number;
  classId: number;
  resolvedThrough: string;
  outcome: string;
  note: string | null;
  resolvedById: number | null;
  resolvedByType: string | null;
  resolvedByName: string | null;
}) => {
  const result = await pool.query(
    `INSERT INTO absence_alert_resolutions
       (center_id, student_id, class_id, resolved_through, outcome, note, resolved_by_id, resolved_by_type, resolved_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING resolution_id, student_id, class_id, resolved_through::text AS resolved_through, outcome, note, resolved_by_name, created_at`,
    [row.centerId, row.studentId, row.classId, row.resolvedThrough, row.outcome, row.note, row.resolvedById, row.resolvedByType, row.resolvedByName]
  );
  return result.rows[0];
};

const freezeStudent = async (studentId: number) => {
  await pool.query('UPDATE students SET is_frozen = true, updated_at = CURRENT_TIMESTAMP WHERE student_id = $1', [studentId]);
};

module.exports = { findRecentAttendance, findResolutions, findStudentDetails, insertResolution, freezeStudent };

export {};
