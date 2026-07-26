const pool = require('../../../db/pool');

const findAllFiltered = (conditions: string[], params: any[]) => {
  let query = 'SELECT * FROM discounts';
  if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ' ORDER BY created_at DESC';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM discounts WHERE discount_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findActiveSerialByStudent = (studentId: number, centerId?: number) => {
  let query = `
    SELECT *
    FROM discounts
    WHERE student_id = $1
      AND active = TRUE
      AND discount_kind = 'serial_discount'
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  `;
  const params: any[] = [studentId];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' ORDER BY created_at DESC LIMIT 1';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const findActiveByStudent = (studentId: number, centerId?: number, discountKind?: string) => {
  let query = `
    SELECT *
    FROM discounts
    WHERE student_id = $1
      AND active = TRUE
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  `;
  const params: any[] = [studentId];
  if (centerId) {
    params.push(centerId);
    query += ` AND center_id = $${params.length}`;
  }
  if (discountKind) {
    params.push(discountKind);
    query += ` AND discount_kind = $${params.length}`;
  }
  query += `
    ORDER BY
      CASE discount_kind WHEN 'serial_discount' THEN 1 ELSE 2 END,
      created_at DESC
    LIMIT 1
  `;
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const insert = (params: any[]) =>
  pool
    .query(
      `INSERT INTO discounts (
        student_id,
        center_id,
        discount_type,
        discount_kind,
        value,
        original_price,
        final_price,
        reason,
        payment_period,
        start_date,
        end_date,
        active
      )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      params
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, params: any[], centerId?: number, queryable: any = pool) =>
  queryable
    .query(
      `UPDATE discounts SET
        discount_type = COALESCE($1, discount_type),
        discount_kind = COALESCE($2, discount_kind),
        value = COALESCE($3, value),
        original_price = COALESCE($4, original_price),
        final_price = COALESCE($5, final_price),
        reason = COALESCE($6, reason),
        payment_period = COALESCE($7, payment_period),
        start_date = COALESCE($8, start_date),
        end_date = COALESCE($9, end_date),
        active = COALESCE($10, active),
        updated_at = CURRENT_TIMESTAMP
       WHERE discount_id = $11${centerId ? ' AND center_id = $12' : ''} RETURNING *`,
      centerId ? [...params, id, centerId] : [...params, id]
    )
    .then((r: any) => r.rows[0] || null);

const remove = (id: number, centerId?: number) => {
  let query = 'DELETE FROM discounts WHERE discount_id = $1';
  const params: any[] = [id];
  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }
  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAllFiltered, findById, findActiveSerialByStudent, findActiveByStudent, insert, update, remove };

export {};
