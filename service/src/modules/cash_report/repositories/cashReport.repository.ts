const pool = require('../../../db/pool');

/** A day's payments in the center's scope (every branch for the owner), with who paid and who took it. */
const findPaymentsOn = async (date: string, centerId?: number) => {
  const result = await pool.query(
    `SELECT p.payment_id, p.amount, p.payment_method, p.received_by_name, p.created_at AS paid_at,
            p.student_id, s.first_name, s.last_name, c.class_name
     FROM payments p
     LEFT JOIN students s ON s.student_id = p.student_id
     LEFT JOIN classes c ON c.class_id = s.class_id
     WHERE p.deleted_at IS NULL AND p.payment_date = $1::date
       AND ($2::int IS NULL OR p.center_id = $2)
     ORDER BY p.created_at, p.payment_id`,
    [date, centerId ?? null]
  );
  return result.rows;
};

const findExpenses = async ({ from, to, centerId }: { from: string; to: string; centerId?: number }) => {
  const result = await pool.query(
    `SELECT expense_id, center_id, expense_date::text AS expense_date, amount, payment_method,
            description, created_by_name, created_at
     FROM expenses
     WHERE deleted_at IS NULL AND expense_date BETWEEN $1::date AND $2::date
       AND ($3::int IS NULL OR center_id = $3)
     ORDER BY expense_date DESC, created_at DESC, expense_id DESC`,
    [from, to, centerId ?? null]
  );
  return result.rows;
};

const insertExpense = async (row: {
  centerId: number; expenseDate: string; amount: number; paymentMethod: string; description: string; createdByName: string | null;
}) => {
  const result = await pool.query(
    `INSERT INTO expenses (center_id, expense_date, amount, payment_method, description, created_by_name)
     VALUES ($1, $2::date, $3, $4, $5, $6)
     RETURNING expense_id, center_id, expense_date::text AS expense_date, amount, payment_method, description, created_by_name, created_at`,
    [row.centerId, row.expenseDate, row.amount, row.paymentMethod, row.description, row.createdByName]
  );
  return result.rows[0];
};

/** Soft delete, only inside the caller's branch. Returns false when there is nothing to delete. */
const softDeleteExpense = async (expenseId: number, centerId?: number) => {
  const result = await pool.query(
    `UPDATE expenses SET deleted_at = CURRENT_TIMESTAMP
     WHERE expense_id = $1 AND deleted_at IS NULL AND ($2::int IS NULL OR center_id = $2)`,
    [expenseId, centerId ?? null]
  );
  return result.rowCount > 0;
};

module.exports = { findPaymentsOn, findExpenses, insertExpense, softDeleteExpense };
export {};
