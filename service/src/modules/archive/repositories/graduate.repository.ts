const pool = require('../../../db/pool');

/**
 * Students archived as "finished successfully", one row per child: the archived record's details
 * plus the history across all of the child's records (other groups, transfers).
 */
const findGraduates = async (centerId?: number) => {
  const result = await pool.query(
    `WITH graduates AS (
       SELECT s.*, COALESCE(s.main_student_id, s.student_id) AS main_id
       FROM students s
       JOIN student_action_reasons r ON r.reason_id = s.delete_reason_id AND r.reason_code = 'finished_successfully'
       WHERE s.deleted_at IS NOT NULL AND ($1::int IS NULL OR s.center_id = $1)
     ),
     history AS (
       SELECT g.student_id,
              MIN(COALESCE(rec.start_date, rec.created_at::date))::text AS studied_from,
              string_agg(DISTINCT c.class_name, ', ') AS groups,
              string_agg(DISTINCT NULLIF(trim(concat_ws(' ', t.last_name, t.first_name)), ''), ', ') AS teachers,
              string_agg(DISTINCT sub.subject_name, ', ') AS subjects
       FROM graduates g
       JOIN students rec ON COALESCE(rec.main_student_id, rec.student_id) = g.main_id
       LEFT JOIN classes c ON c.class_id = rec.class_id
       LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
       LEFT JOIN subjects sub ON sub.class_id = rec.class_id
       GROUP BY g.student_id
     )
     SELECT g.student_id, g.center_id, g.first_name, g.last_name, g.father_name, g.passport_number,
            g.date_of_birth::text AS date_of_birth, g.phone, g.parent_name, g.parent_phone,
            g.school_name, g.school_class, g.study_place_type, g.delete_reason_note AS result,
            h.studied_from, g.deleted_at::date::text AS finished_on, h.groups, h.teachers, h.subjects,
            COALESCE((SELECT json_agg(json_build_object('certificate_id', sc.certificate_id, 'title', sc.title,
                       'file_name', sc.file_name, 'file_size', sc.file_size, 'created_at', sc.created_at) ORDER BY sc.created_at)
                      FROM student_certificates sc WHERE sc.student_id = g.student_id AND sc.deleted_at IS NULL), '[]') AS certificates
     FROM graduates g
     JOIN history h ON h.student_id = g.student_id
     ORDER BY g.deleted_at DESC, g.student_id DESC`,
    [centerId ?? null]
  );
  return result.rows;
};

/** The graduate's branch, or null when the student is not an archived graduate in the caller's branch. */
const findGraduateCenter = async (studentId: number, centerId?: number) => {
  const result = await pool.query(
    `SELECT s.center_id FROM students s
     JOIN student_action_reasons r ON r.reason_id = s.delete_reason_id AND r.reason_code = 'finished_successfully'
     WHERE s.student_id = $1 AND s.deleted_at IS NOT NULL AND ($2::int IS NULL OR s.center_id = $2)`,
    [studentId, centerId ?? null]
  );
  return result.rows[0]?.center_id ?? null;
};

const insertCertificate = async (row: { centerId: number; studentId: number; title: string; fileName: string; data: Buffer; uploadedByName: string | null }) => {
  const result = await pool.query(
    `INSERT INTO student_certificates (center_id, student_id, title, file_name, file_size, file_data, uploaded_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING certificate_id, title, file_name, file_size, created_at`,
    [row.centerId, row.studentId, row.title, row.fileName, row.data.length, row.data, row.uploadedByName]
  );
  return result.rows[0];
};

const findCertificateFile = async (certificateId: number, centerId?: number) => {
  const result = await pool.query(
    `SELECT file_name, file_data FROM student_certificates
     WHERE certificate_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [certificateId, centerId ?? null]
  );
  return result.rows[0] || null;
};

const softDeleteCertificate = async (certificateId: number, centerId?: number) => {
  const result = await pool.query(
    `UPDATE student_certificates SET deleted_at = CURRENT_TIMESTAMP
     WHERE certificate_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [certificateId, centerId ?? null]
  );
  return result.rowCount > 0;
};

module.exports = { findGraduates, findGraduateCenter, insertCertificate, findCertificateFile, softDeleteCertificate };
export {};
