const pool = require('../../../db/pool');

const selectAllStudents = (centerId?: number) => {
  let query = 'SELECT * FROM students';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY student_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllTeachers = (centerId?: number) => {
  let query = 'SELECT * FROM teachers';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY teacher_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const selectAllPayments = (centerId?: number) => {
  let query = 'SELECT * FROM payments';
  const params: any[] = [];
  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }
  query += ' ORDER BY payment_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const insertStudent = (params: any[]) =>
  pool.query(
    `INSERT INTO students (center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    params
  );

const insertTeacher = (params: any[]) =>
  pool.query(
    `INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    params
  );

const insertPayment = (params: any[]) =>
  pool.query(
    `INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    params
  );

module.exports = {
  selectAllStudents,
  selectAllTeachers,
  selectAllPayments,
  insertStudent,
  insertTeacher,
  insertPayment,
};

export {};
