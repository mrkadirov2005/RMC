const pool = require('../../../db/pool');

/** Watched students in scope, with what the director needs to follow up on each. */
const findActive = async (centerId?: number) => {
  const result = await pool.query(
    `SELECT w.watch_id, w.center_id, w.student_id, w.contact_name, w.contact_phone, w.note, w.added_by_name,
            w.created_at, s.first_name, s.last_name, s.father_name, s.phone, s.parent_name, s.parent_phone,
            s.school_name, s.school_class, s.status, s.class_id,
            COALESCE(s.main_student_id, s.student_id) AS main_student_id,
            c.class_name, NULLIF(trim(concat_ws(' ', t.last_name, t.first_name)), '') AS teacher_name
     FROM student_watchlist w
     JOIN students s ON s.student_id = w.student_id
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE w.removed_at IS NULL AND ($1::int IS NULL OR w.center_id = $1)
     ORDER BY s.last_name, s.first_name`,
    [centerId ?? null]
  );
  return result.rows;
};

/** The student's branch, or null when they are not in the caller's branch or were deleted. */
const findStudentCenter = async (studentId: number, centerId?: number) => {
  const result = await pool.query(
    `SELECT center_id FROM students WHERE student_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [studentId, centerId ?? null]
  );
  return result.rows[0]?.center_id ?? null;
};

const insert = async (row: { centerId: number; studentId: number; contactName: string; contactPhone: string | null; note: string | null; addedByName: string | null }) => {
  const result = await pool.query(
    `INSERT INTO student_watchlist (center_id, student_id, contact_name, contact_phone, note, added_by_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (student_id) WHERE removed_at IS NULL DO NOTHING
     RETURNING watch_id`,
    [row.centerId, row.studentId, row.contactName, row.contactPhone, row.note, row.addedByName]
  );
  return result.rows[0] || null;
};

const update = async (watchId: number, fields: { contactName: string; contactPhone: string | null; note: string | null }, centerId?: number) => {
  const result = await pool.query(
    `UPDATE student_watchlist SET contact_name = $2, contact_phone = $3, note = $4
     WHERE watch_id = $1 AND removed_at IS NULL AND ($5::int IS NULL OR center_id = $5)
     RETURNING watch_id`,
    [watchId, fields.contactName, fields.contactPhone, fields.note, centerId ?? null]
  );
  return result.rowCount > 0;
};

const softRemove = async (watchId: number, centerId?: number) => {
  const result = await pool.query(
    `UPDATE student_watchlist SET removed_at = CURRENT_TIMESTAMP
     WHERE watch_id = $1 AND removed_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [watchId, centerId ?? null]
  );
  return result.rowCount > 0;
};

module.exports = { findActive, findStudentCenter, insert, update, softRemove };
export {};
