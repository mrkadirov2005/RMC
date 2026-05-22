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

const upsertStudent = (params: any[], hasStudentId: boolean) => {
  if (hasStudentId) {
    return pool.query(
      `INSERT INTO students (student_id, center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (student_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         enrollment_number = EXCLUDED.enrollment_number,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         parent_name = EXCLUDED.parent_name,
         parent_phone = EXCLUDED.parent_phone,
         gender = EXCLUDED.gender,
         status = EXCLUDED.status,
         teacher_id = EXCLUDED.teacher_id,
         class_id = EXCLUDED.class_id,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertStudent(params);
};

const upsertTeacher = (params: any[], hasTeacherId: boolean) => {
  if (hasTeacherId) {
    return pool.query(
      `INSERT INTO teachers (teacher_id, center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (teacher_id) DO UPDATE SET
         center_id = EXCLUDED.center_id,
         employee_id = EXCLUDED.employee_id,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         email = EXCLUDED.email,
         phone = EXCLUDED.phone,
         date_of_birth = EXCLUDED.date_of_birth,
         gender = EXCLUDED.gender,
         qualification = EXCLUDED.qualification,
         specialization = EXCLUDED.specialization,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertTeacher(params);
};

const upsertPayment = (params: any[], hasPaymentId: boolean) => {
  if (hasPaymentId) {
    return pool.query(
      `INSERT INTO payments (payment_id, student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (payment_id) DO UPDATE SET
         student_id = EXCLUDED.student_id,
         center_id = EXCLUDED.center_id,
         payment_date = EXCLUDED.payment_date,
         amount = EXCLUDED.amount,
         currency = EXCLUDED.currency,
         payment_method = EXCLUDED.payment_method,
         transaction_reference = EXCLUDED.transaction_reference,
         receipt_number = EXCLUDED.receipt_number,
         payment_status = EXCLUDED.payment_status,
         payment_type = EXCLUDED.payment_type,
         notes = EXCLUDED.notes,
         updated_at = CURRENT_TIMESTAMP`,
      params
    );
  }
  return insertPayment(params);
};

const syncSerialSequence = (table: string, idColumn: string) =>
  pool.query(`SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1), true)`, [
    table,
    idColumn,
  ]);

module.exports = {
  selectAllStudents,
  selectAllTeachers,
  selectAllPayments,
  insertStudent,
  insertTeacher,
  insertPayment,
  upsertStudent,
  upsertTeacher,
  upsertPayment,
  syncSerialSequence,
};

export {};
