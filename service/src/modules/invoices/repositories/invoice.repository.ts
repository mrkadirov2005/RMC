const pool = require('../../../db/pool');

const findAllFiltered = (conditions: string[], params: any[]) => {
  let query = 'SELECT * FROM invoices';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM invoices WHERE invoice_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findItems = (invoiceId: number) =>
  pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]).then((r: any) => r.rows);

const countNumberLike = (pattern: string, centerId?: number) => {
  let query = 'SELECT COUNT(*)::int AS count FROM invoices WHERE invoice_number LIKE $1';
  const params: any[] = [pattern];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0]?.count || 0);
};

const insertInvoice = (params: any[]) =>
  pool
    .query(
      `INSERT INTO invoices (student_id, center_id, invoice_number, issue_date, due_date, status, subtotal, discount_total, tax_total, total, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const insertItem = (invoiceId: number, description: string, qty: number, price: number, lineTotal: number) =>
  pool.query(
    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
     VALUES ($1,$2,$3,$4,$5)`,
    [invoiceId, description, qty, price, lineTotal]
  );

const deleteItemsByInvoice = (invoiceId: number) => pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

const updateInvoice = (params: any[], centerId?: number) =>
  pool
    .query(
      `UPDATE invoices SET
        issue_date = COALESCE($1, issue_date),
        due_date = COALESCE($2, due_date),
        status = COALESCE($3, status),
        discount_total = COALESCE($4, discount_total),
        tax_total = COALESCE($5, tax_total),
        subtotal = $6,
        total = $7,
        notes = COALESCE($8, notes),
        updated_at = CURRENT_TIMESTAMP
       WHERE invoice_id = $9${centerId ? ' AND center_id = $10' : ''} RETURNING *`,
      centerId ? [...params, centerId] : params
    )
    .then((r: any) => r.rows[0] || null);

const deleteInvoice = (id: number, centerId?: number) => {
  let query = 'DELETE FROM invoices WHERE invoice_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = {
  findAllFiltered,
  findById,
  findItems,
  countNumberLike,
  insertInvoice,
  insertItem,
  deleteItemsByInvoice,
  updateInvoice,
  deleteInvoice,
};

export {};
