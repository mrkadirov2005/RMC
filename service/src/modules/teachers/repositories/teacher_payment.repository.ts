const pool = require('../../../db/pool');
const { db, sql } = pool;

const findByTeacherId = (teacherId: number) =>
  db
    .execute(sql`SELECT teacher_id, password_hash, is_active FROM teacher_payment_credentials WHERE teacher_id = ${teacherId}`)
    .then((r: any) => r.rows[0] || null);

const upsertPassword = (teacherId: number, passwordHash: string, updatedBy?: number) =>
  db
    .execute(sql`
      INSERT INTO teacher_payment_credentials (teacher_id, password_hash, created_by, updated_by)
       VALUES (${teacherId}, ${passwordHash}, ${updatedBy || null}, ${updatedBy || null})
       ON CONFLICT (teacher_id)
       DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
       RETURNING teacher_id, is_active, updated_at
    `)
    .then((r: any) => r.rows[0] || null);

const markUsed = (teacherId: number) =>
  db.execute(sql`UPDATE teacher_payment_credentials SET last_used_at = CURRENT_TIMESTAMP WHERE teacher_id = ${teacherId}`);

module.exports = {
  findByTeacherId,
  upsertPassword,
  markUsed,
};

export {};
