const pool = require('../../../db/pool');

const findAll = (centerId?: number) => {
  let query = 'SELECT * FROM edu_centers';
  const params: any[] = [];

  if (centerId) {
    query += ' WHERE center_id = $1';
    params.push(centerId);
  }

  query += ' ORDER BY center_id';
  return pool.query(query, params).then((r: any) => r.rows);
};

const findById = (id: number, centerId?: number) => {
  let query = 'SELECT * FROM edu_centers WHERE center_id = $1';
  const params: any[] = [id];

  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }

  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const getSummaries = (centerId?: number) => {
  const params: any[] = [];
  const centerFilter = centerId ? 'WHERE ec.center_id = $1' : '';
  if (centerId) params.push(centerId);

  const query = `
    SELECT
      ec.center_id,
      COALESCE(s.students, 0)::int AS students,
      COALESCE(t.teachers, 0)::int AS teachers,
      COALESCE(c.classes, 0)::int AS classes,
      COALESCE(p.payments, 0)::int AS payments,
      COALESCE(p.collected, 0)::numeric AS collected
    FROM edu_centers ec
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS students
      FROM students
      WHERE deleted_at IS NULL
      GROUP BY center_id
    ) s ON s.center_id = ec.center_id
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS teachers
      FROM teachers
      WHERE deleted_at IS NULL
      GROUP BY center_id
    ) t ON t.center_id = ec.center_id
    LEFT JOIN (
      SELECT center_id, COUNT(*)::int AS classes
      FROM classes
      WHERE deleted_at IS NULL
      GROUP BY center_id
    ) c ON c.center_id = ec.center_id
    LEFT JOIN (
      SELECT
        center_id,
        COUNT(*)::int AS payments,
        SUM(
          CASE
            WHEN LOWER(COALESCE(payment_status, '')) IN ('completed', 'paid')
            THEN COALESCE(amount, 0)
            ELSE 0
          END
        )::numeric AS collected
      FROM payments
      WHERE deleted_at IS NULL
      GROUP BY center_id
    ) p ON p.center_id = ec.center_id
    ${centerFilter}
    ORDER BY ec.center_id
  `;

  return pool.query(query, params).then((r: any) => r.rows);
};

const insert = (values: any[]) =>
  pool
    .query(
      'INSERT INTO edu_centers (center_name, center_code, email, phone, address, city, principal_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      values
    )
    .then((r: any) => r.rows[0]);

const update = (id: number, values: any[], centerId?: number) => {
  const params: any[] = [...values, id];
  let query =
    'UPDATE edu_centers SET center_name = COALESCE($1, center_name), email = COALESCE($2, email), phone = COALESCE($3, phone), address = COALESCE($4, address), city = COALESCE($5, city), principal_name = COALESCE($6, principal_name), updated_at = CURRENT_TIMESTAMP WHERE center_id = $7';

  if (centerId) {
    query += ' AND center_id = $8';
    params.push(centerId);
  }

  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, centerId?: number) => {
  const params: any[] = [id];
  let query = 'DELETE FROM edu_centers WHERE center_id = $1';

  if (centerId) {
    query += ' AND center_id = $2';
    params.push(centerId);
  }

  query += ' RETURNING *';
  return pool.query(query, params).then((r: any) => r.rows[0] || null);
};

module.exports = { findAll, findById, getSummaries, insert, update, remove };

export {};
