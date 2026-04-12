const pool = require('../../../db/pool');

const findAllFiltered = (conditions: string[], params: any[]) => {
  let query = 'SELECT * FROM refunds';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number) =>
  pool.query('SELECT * FROM refunds WHERE refund_id = $1', [id]).then((r: any) => r.rows[0] || null);

const insert = (params: any[]) =>
  pool
    .query(`INSERT INTO refunds (payment_id, amount, reason) VALUES ($1,$2,$3) RETURNING *`, params)
    .then((r: any) => r.rows[0]);

const update = (id: number, status: any, refunded_at: any) =>
  pool
    .query(
      `UPDATE refunds SET
        status = COALESCE($1, status),
        refunded_at = COALESCE($2, refunded_at),
        updated_at = CURRENT_TIMESTAMP
       WHERE refund_id = $3 RETURNING *`,
      [status, refunded_at, id]
    )
    .then((r: any) => r.rows[0] || null);

const updatePaymentRefunded = (paymentId: number) =>
  pool.query(`UPDATE payments SET payment_status = 'Refunded', updated_at = CURRENT_TIMESTAMP WHERE payment_id = $1`, [paymentId]);

const remove = (id: number) =>
  pool.query('DELETE FROM refunds WHERE refund_id = $1 RETURNING *', [id]).then((r: any) => r.rows[0] || null);

module.exports = { findAllFiltered, findById, insert, update, updatePaymentRefunded, remove };

export {};
