export {};

// Rows for the retention breakdown and the admissions balance (Retention page). Plain SQL with
// table aliases throughout, so no column is ever printed without its table.
const pool = require('../../../db/pool');

export type BreakdownFilters = { centerId?: number; start: string; end: string; teacherId?: number; subject?: string; levelId?: number };

// The group a row belongs to must match the teacher, subject and level filters.
const groupFilters = (filters: BreakdownFilters, params: any[], classAlias = 'c') => {
  const where: string[] = [];
  const add = (value: unknown) => { params.push(value); return `$${params.length}`; };
  if (filters.teacherId) where.push(`${classAlias}.teacher_id = ${add(filters.teacherId)}`);
  if (filters.levelId) where.push(`${classAlias}.level_id = ${add(filters.levelId)}`);
  if (filters.subject) where.push(`EXISTS (SELECT 1 FROM subjects sub_f WHERE sub_f.class_id = ${classAlias}.class_id AND lower(trim(sub_f.subject_name)) = lower(trim(${add(filters.subject)})))`);
  return where;
};

/** Every group record that ended in the period: left the center (deleted) or was transferred out. */
const findLeavers = async (filters: BreakdownFilters) => {
  const params: any[] = [filters.start, filters.end];
  const where = [
    `((s.deleted_at IS NOT NULL AND (s.status IS NULL OR s.status <> 'Transferred') AND s.deleted_at::date BETWEEN $1::date AND $2::date)
      OR (s.status = 'Transferred' AND s.end_date::date BETWEEN $1::date AND $2::date))`,
  ];
  if (filters.centerId) { params.push(filters.centerId); where.push(`s.center_id = $${params.length}`); }
  where.push(...groupFilters(filters, params));
  const result = await pool.query(
    `SELECT s.student_id, s.first_name, s.last_name, s.phone, s.status,
            s.start_date::date::text AS started_on,
            (CASE WHEN s.status = 'Transferred' THEN s.end_date::date ELSE s.deleted_at::date END)::text AS left_on,
            r.reason_code, r.reason_name, s.delete_reason_note AS reason_note,
            c.class_id, c.class_name, c.teacher_id,
            COALESCE(c.start_date::date, c.created_at::date)::text AS group_started_on,
            NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name,
            (SELECT sub.subject_name FROM subjects sub WHERE sub.class_id = c.class_id ORDER BY sub.subject_id LIMIT 1) AS subject_name,
            c.level_id, (SELECT l.level_name FROM subject_levels l WHERE l.level_id = c.level_id) AS level_name,
            (SELECT COUNT(*)::int FROM attendance a
              WHERE a.student_id = s.student_id AND a.status IN ('Present', 'Late')) AS lessons_attended
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     LEFT JOIN student_action_reasons r ON r.reason_id = CASE WHEN s.status = 'Transferred' THEN s.transfer_reason_id ELSE s.delete_reason_id END
     WHERE ${where.join(' AND ')}
     ORDER BY left_on DESC, s.student_id DESC`,
    params,
  );
  return result.rows;
};

/** Students each teacher had in the period: group records that ran at any time in it. */
const studentsPerTeacher = async (filters: BreakdownFilters) => {
  const params: any[] = [filters.start, filters.end];
  const where = [
    'c.teacher_id IS NOT NULL',
    '(s.start_date IS NULL OR s.start_date::date <= $2::date)',
    `(s.deleted_at IS NULL OR s.deleted_at::date >= $1::date)`,
    `(s.end_date IS NULL OR s.end_date::date >= $1::date)`,
  ];
  if (filters.centerId) { params.push(filters.centerId); where.push(`s.center_id = $${params.length}`); }
  where.push(...groupFilters(filters, params));
  const result = await pool.query(
    `SELECT c.teacher_id, NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name, COUNT(DISTINCT s.student_id)::int AS students
     FROM students s
     JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     WHERE ${where.join(' AND ')}
     GROUP BY c.teacher_id, t.first_name, t.last_name`,
    params,
  );
  return result.rows;
};

/**
 * New students in the period: a child's first group record (not one made by a transfer, and not a
 * second group of a child already studying), with the teacher whose group they joined and
 * whether they came asking for a teacher.
 */
const findNewStudents = async (filters: BreakdownFilters) => {
  const params: any[] = [filters.start, filters.end];
  const where = [
    's.transferred_from_student_id IS NULL',
    's.main_student_id IS NULL',
    `COALESCE(s.start_date::date, s.created_at::date) BETWEEN $1::date AND $2::date`,
    `(s.deleted_at IS NULL OR COALESCE(s.delete_reason_id, 0) NOT IN (SELECT reason_id FROM student_action_reasons WHERE reason_code IN ('admin_mistake', 'duplicate_record')))`,
  ];
  if (filters.centerId) { params.push(filters.centerId); where.push(`s.center_id = $${params.length}`); }
  where.push(...groupFilters(filters, params));
  const result = await pool.query(
    `SELECT s.student_id, s.first_name, s.last_name,
            COALESCE(s.start_date::date, s.created_at::date)::text AS joined_on,
            c.class_name, c.teacher_id, NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name,
            s.referred_by_teacher_id,
            NULLIF(trim(concat_ws(' ', rt.first_name, rt.last_name)), '') AS referred_by_teacher_name,
            src.source_code, src.source_name
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
     LEFT JOIN teachers rt ON rt.teacher_id = s.referred_by_teacher_id
     LEFT JOIN student_acquisition_sources src ON src.source_id = s.acquisition_source_id
     WHERE ${where.join(' AND ')}
     ORDER BY joined_on DESC, s.student_id DESC`,
    params,
  );
  return result.rows;
};

module.exports = { findLeavers, studentsPerTeacher, findNewStudents };
