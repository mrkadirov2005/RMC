const pool = require('../../../db/pool');

const findByTeacherId = (teacherId: number) =>
  pool
    .query('SELECT teacher_id, password_hash, is_active FROM teacher_payment_credentials WHERE teacher_id = $1', [
      teacherId,
    ])
    .then((r: any) => r.rows[0] || null);

const upsertPassword = (teacherId: number, passwordHash: string, updatedBy?: number) =>
  pool
    .query(
      `INSERT INTO teacher_payment_credentials (teacher_id, password_hash, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (teacher_id)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
       RETURNING teacher_id, is_active, updated_at`,
      [teacherId, passwordHash, updatedBy || null]
    )
    .then((r: any) => r.rows[0] || null);

const markUsed = (teacherId: number) =>
  pool.query('UPDATE teacher_payment_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE teacher_id = $1', [teacherId]);

module.exports = {
  findByTeacherId,
  upsertPassword,
  markUsed,
};

export {};
