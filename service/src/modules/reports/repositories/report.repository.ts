const pool = require('../../../db/pool');

const countStudents = (centerFilter: string, params: any[]) =>
  pool
    .query(
      `SELECT COUNT(*)::int AS total, SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END)::int AS active
       FROM students ${centerFilter}`,
      params
    )
    .then((r: any) => r.rows[0]);

const countTeachers = (centerFilter: string, params: any[]) =>
  pool.query(`SELECT COUNT(*)::int AS total FROM teachers ${centerFilter}`, params).then((r: any) => r.rows[0]);

const countClasses = (centerFilter: string, params: any[]) =>
  pool.query(`SELECT COUNT(*)::int AS total FROM classes ${centerFilter}`, params).then((r: any) => r.rows[0]);

const sumPayments = (where: string, params: any[]) =>
  pool
    .query(
      `SELECT COALESCE(SUM(amount),0)::numeric AS total_revenue, COUNT(*)::int AS payments_count
       FROM payments ${where}`,
      params
    )
    .then((r: any) => r.rows[0]);

const sumDebts = (where: string, params: any[]) =>
  pool
    .query(`SELECT COALESCE(SUM(balance),0)::numeric AS total_outstanding FROM debts ${where}`, params)
    .then((r: any) => r.rows[0]);

const paymentsByMonth = (where: string, params: any[]) =>
  pool
    .query(
      `SELECT 
         EXTRACT(YEAR FROM payment_date)::int AS year,
         EXTRACT(MONTH FROM payment_date)::int AS month,
         COUNT(*)::int AS payments_count,
         SUM(amount)::numeric AS total_amount
       FROM payments
       ${where}
       GROUP BY year, month
       ORDER BY year DESC, month DESC`,
      params
    )
    .then((r: any) => r.rows);

const paymentsAggregate = (where: string, params: any[]) =>
  pool
    .query(
      `SELECT COUNT(*)::int AS payments_count, COALESCE(SUM(amount),0)::numeric AS total_amount
       FROM payments ${where}`,
      params
    )
    .then((r: any) => r.rows[0]);

const attendanceByStatus = (where: string, params: any[]) =>
  pool
    .query(
      `SELECT status, COUNT(*)::int AS count
       FROM attendance
       ${where}
       GROUP BY status`,
      params
    )
    .then((r: any) => r.rows);

module.exports = {
  countStudents,
  countTeachers,
  countClasses,
  sumPayments,
  sumDebts,
  paymentsByMonth,
  paymentsAggregate,
  attendanceByStatus,
};

export {};
