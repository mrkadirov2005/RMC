const pool = require('../../../db/pool');

const addCenterScope = (conditions: string[], params: any[], alias: string, centerId?: number) => {
  if (!centerId) return;
  params.push(centerId);
  conditions.push(`${alias}.center_id = $${params.length}`);
};

const findArchivedStudents = async (centerId?: number) => {
  const params: any[] = [];
  const conditions = ['s.deleted_at IS NOT NULL'];
  addCenterScope(conditions, params, 's', centerId);
  const result = await pool.query(
    `
      SELECT
        s.student_id,
        s.center_id,
        s.enrollment_number,
        s.first_name,
        s.last_name,
        s.email,
        s.phone,
        s.status,
        s.teacher_id,
        s.class_id,
        s.deleted_at,
        c.class_name,
        c.class_code,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      LEFT JOIN teachers t ON t.teacher_id = s.teacher_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.deleted_at DESC, s.student_id DESC
    `,
    params
  );
  return result.rows;
};

const findArchivedTeachers = async (centerId?: number) => {
  const params: any[] = [];
  const conditions = ['t.deleted_at IS NOT NULL'];
  addCenterScope(conditions, params, 't', centerId);
  const result = await pool.query(
    `
      SELECT
        t.teacher_id,
        t.center_id,
        t.employee_id,
        t.first_name,
        t.last_name,
        t.email,
        t.phone,
        t.status,
        t.deleted_at
      FROM teachers t
      WHERE ${conditions.join(' AND ')}
      ORDER BY t.deleted_at DESC, t.teacher_id DESC
    `,
    params
  );
  return result.rows;
};

const findArchivedClasses = async (centerId?: number) => {
  const params: any[] = [];
  const conditions = ['c.deleted_at IS NOT NULL'];
  addCenterScope(conditions, params, 'c', centerId);
  const result = await pool.query(
    `
      SELECT
        c.class_id,
        c.center_id,
        c.class_name,
        c.class_code,
        c.level,
        c.capacity,
        c.teacher_id,
        c.room_number,
        c.payment_amount,
        c.payment_frequency,
        c.deleted_at,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name
      FROM classes c
      LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.deleted_at DESC, c.class_id DESC
    `,
    params
  );
  return result.rows;
};

const findArchivedPayments = async (centerId?: number) => {
  const params: any[] = [];
  const conditions = ['p.deleted_at IS NOT NULL'];
  addCenterScope(conditions, params, 'p', centerId);
  const result = await pool.query(
    `
      SELECT
        p.payment_id,
        p.student_id,
        p.center_id,
        p.payment_date,
        p.amount,
        p.currency,
        p.payment_method,
        p.receipt_number,
        p.payment_status,
        p.payment_type,
        p.deleted_at,
        s.first_name AS student_first_name,
        s.last_name AS student_last_name,
        s.enrollment_number
      FROM payments p
      LEFT JOIN students s ON s.student_id = p.student_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.deleted_at DESC, p.payment_id DESC
    `,
    params
  );
  return result.rows;
};

const findArchivedSessions = async (centerId?: number) => {
  const params: any[] = [];
  const conditions = ['se.deleted_at IS NOT NULL'];
  addCenterScope(conditions, params, 'se', centerId);
  const result = await pool.query(
    `
      SELECT
        se.session_id,
        se.center_id,
        se.class_id,
        se.teacher_id,
        se.session_date,
        se.start_time,
        se.duration_minutes,
        se.end_time,
        se.deleted_at,
        c.class_name,
        c.class_code,
        t.first_name AS teacher_first_name,
        t.last_name AS teacher_last_name
      FROM sessions se
      LEFT JOIN classes c ON c.class_id = se.class_id
      LEFT JOIN teachers t ON t.teacher_id = se.teacher_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY se.deleted_at DESC, se.session_id DESC
    `,
    params
  );
  return result.rows;
};

module.exports = {
  findArchivedStudents,
  findArchivedTeachers,
  findArchivedClasses,
  findArchivedPayments,
  findArchivedSessions,
};

export {};
