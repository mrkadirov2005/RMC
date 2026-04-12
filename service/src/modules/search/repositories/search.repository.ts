const pool = require('../../../db/pool');

const buildScopedQuery = (
  baseSelect: string,
  nameConditions: string[],
  params: any[],
  centerId?: number,
  extraConditions: string[] = []
) => {
  const conditions = [`(${nameConditions.join(' OR ')})`, ...extraConditions];
  if (centerId) {
    params.push(centerId);
    conditions.push(`center_id = $${params.length}`);
  }
  return `${baseSelect} WHERE ${conditions.join(' AND ')}`;
};

const searchStudents = (pattern: string, max: number, centerId?: number, teacherId?: number) => {
  const params: any[] = [pattern, max];
  const extraConditions: string[] = [];
  if (teacherId) {
    params.push(teacherId);
    extraConditions.push(`teacher_id = $${params.length}`);
  }
  const query =
    buildScopedQuery(
      `SELECT student_id, first_name, last_name, enrollment_number, email, phone, class_id
       FROM students`,
      [
        'first_name ILIKE $1',
        'last_name ILIKE $1',
        'enrollment_number ILIKE $1',
        'email ILIKE $1',
        'phone ILIKE $1',
      ],
      params,
      centerId,
      extraConditions
    ) + ' ORDER BY student_id DESC LIMIT $2';
  return pool.query(query, params).then((r: any) => r.rows);
};

const searchTeachers = (pattern: string, max: number, centerId?: number) => {
  const params: any[] = [pattern, max];
  const query =
    buildScopedQuery(
      `SELECT teacher_id, first_name, last_name, employee_id, email, phone
       FROM teachers`,
      ['first_name ILIKE $1', 'last_name ILIKE $1', 'employee_id ILIKE $1', 'email ILIKE $1', 'phone ILIKE $1'],
      params,
      centerId
    ) + ' ORDER BY teacher_id DESC LIMIT $2';
  return pool.query(query, params).then((r: any) => r.rows);
};

const searchClasses = (pattern: string, max: number, centerId?: number) => {
  const params: any[] = [pattern, max];
  const query =
    buildScopedQuery(
      `SELECT class_id, class_name, class_code, level, section
       FROM classes`,
      ['class_name ILIKE $1', 'class_code ILIKE $1'],
      params,
      centerId
    ) + ' ORDER BY class_id DESC LIMIT $2';
  return pool.query(query, params).then((r: any) => r.rows);
};

const searchPayments = (pattern: string, max: number, centerId?: number) => {
  const params: any[] = [pattern, max];
  const query =
    buildScopedQuery(
      `SELECT payment_id, student_id, amount, payment_date, payment_status, payment_type, receipt_number
       FROM payments`,
      ['receipt_number ILIKE $1', 'payment_type ILIKE $1'],
      params,
      centerId
    ) + ' ORDER BY payment_id DESC LIMIT $2';
  return pool.query(query, params).then((r: any) => r.rows);
};

module.exports = { searchStudents, searchTeachers, searchClasses, searchPayments };

export {};
