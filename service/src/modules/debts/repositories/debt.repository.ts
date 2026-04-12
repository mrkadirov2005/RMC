const pool = require('../../../db/pool');

const findAll = (centerId?: number, teacherId?: number) => {
  let query = 'SELECT d.* FROM debts d';
  const params: any[] = [];
  const conditions: string[] = [];

  if (centerId) {
    params.push(centerId);
    conditions.push(`d.center_id = $${params.length}`);
  }
  if (teacherId) {
    query += ' JOIN students s ON s.student_id = d.student_id';
    params.push(teacherId);
    conditions.push(`s.teacher_id = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY d.debt_id DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT d.* FROM debts d WHERE d.debt_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND d.center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND d.student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1})`;
    params.push(teacherId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO debts (student_id, center_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const findAmounts = (id: number) =>
  pool.query('SELECT debt_amount, amount_paid FROM debts WHERE debt_id = $1', [id]).then((r: any) => r.rows[0] || null);

const updatePaid = (id: number, amount_paid: number, balance: number, remarks: any, centerId?: number, teacherId?: number) => {
  let query =
    'UPDATE debts SET amount_paid = $1, balance = $2, remarks = COALESCE($3, remarks), updated_at = CURRENT_TIMESTAMP WHERE debt_id = $4';
  const params: any[] = [amount_paid, balance, remarks, id];
  if (centerId) {
    query += ' AND center_id = $5';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1})`;
    params.push(teacherId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findByStudent = (studentId: number, centerId?: number, teacherId?: number) => {
  let query = 'SELECT d.* FROM debts d WHERE d.student_id = $1';
  const params: any[] = [studentId];
  if (centerId) {
    query += ' AND d.center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND d.student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1})`;
    params.push(teacherId);
  }
  query += ' ORDER BY d.debt_date DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const remove = (id: number, centerId?: number, teacherId?: number) => {
  let query = 'DELETE FROM debts WHERE debt_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  if (teacherId) {
    query += ` AND student_id IN (SELECT student_id FROM students WHERE teacher_id = $${params.length + 1})`;
    params.push(teacherId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findActiveStudents = (center_id?: string, teacherId?: number) => {
  let q = 'SELECT student_id, first_name, last_name, enrollment_number, center_id FROM students WHERE status = $1';
  const params: any[] = ['Active'];
  if (center_id) {
    q += ' AND center_id = $2';
    params.push(center_id);
  }
  if (teacherId) {
    q += ` AND teacher_id = $${params.length + 1}`;
    params.push(teacherId);
  }
  return pool.query(q, params).then((r: any) => r.rows);
};

const findPaymentsForStudentInRange = (studentId: number, start: Date, end: Date) =>
  pool
    .query(
      `
      SELECT payment_date, amount, payment_status, payment_type
      FROM payments
      WHERE student_id = $1
        AND payment_date >= $2
        AND payment_date <= $3
        AND payment_status = 'Completed'
      ORDER BY payment_date ASC
    `,
      [studentId, start, end]
    )
    .then((r: any) => r.rows);

const findOpenDebtsForStudent = (studentId: number) =>
  pool
    .query(
      `
      SELECT debt_id, debt_amount, debt_date, due_date, amount_paid, balance
      FROM debts
      WHERE student_id = $1 AND balance > 0
      ORDER BY debt_date ASC
    `,
      [studentId]
    )
    .then((r: any) => r.rows);

const getStudentCenter = (studentId: number) =>
  pool.query('SELECT center_id FROM students WHERE student_id = $1', [studentId]).then((r: any) => r.rows[0]?.center_id);

const paymentMonthlySummary = (studentId: number) =>
  pool
    .query(
      `
      SELECT
        EXTRACT(YEAR FROM payment_date) as year,
        EXTRACT(MONTH FROM payment_date) as month,
        SUM(amount) as total_paid,
        COUNT(*) as payment_count
      FROM payments
      WHERE student_id = $1 AND payment_status = 'Completed'
      GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date)
      ORDER BY year DESC, month DESC
    `,
      [studentId]
    )
    .then((r: any) => r.rows);

const debtAggregate = (studentId: number) =>
  pool
    .query(
      `
      SELECT
        SUM(debt_amount) as total_debt,
        SUM(amount_paid) as total_paid,
        SUM(balance) as total_balance
      FROM debts
      WHERE student_id = $1
    `,
      [studentId]
    )
    .then((r: any) => r.rows[0]);

module.exports = {
  findAll,
  findById,
  insert,
  findAmounts,
  updatePaid,
  findByStudent,
  remove,
  findActiveStudents,
  findPaymentsForStudentInRange,
  findOpenDebtsForStudent,
  getStudentCenter,
  paymentMonthlySummary,
  debtAggregate,
};

export {};
