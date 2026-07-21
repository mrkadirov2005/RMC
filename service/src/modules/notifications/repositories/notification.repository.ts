const pool = require('../../../db/pool');
const { db, sql } = pool;

const findByUser = (userType: string, userId: number, centerId?: number) => {
  if (centerId) {
    return db.execute(sql`
      SELECT * FROM notifications
      WHERE user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      ORDER BY created_at DESC
    `).then((r: any) => r.rows);
  }
  return db.execute(sql`
    SELECT * FROM notifications
    WHERE user_type = ${userType} AND user_id = ${userId}
    ORDER BY created_at DESC
  `).then((r: any) => r.rows);
};

const insert = (params: any[]) =>
  db
    .execute(sql`
      INSERT INTO notifications (center_id, user_type, user_id, title, message, type)
      VALUES (${params[0]}, ${params[1]}, ${params[2]}, ${params[3]}, ${params[4]}, ${params[5]})
      RETURNING *
    `)
    .then((r: any) => r.rows[0]);

const markRead = (id: number, userType: string, userId: number, centerId?: number) => {
  if (centerId) {
    return db.execute(sql`
      UPDATE notifications
      SET is_read = TRUE
      WHERE notification_id = ${id} AND user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      RETURNING *
    `).then((r: any) => r.rows[0] || null);
  }
  return db.execute(sql`
    UPDATE notifications
    SET is_read = TRUE
    WHERE notification_id = ${id} AND user_type = ${userType} AND user_id = ${userId}
    RETURNING *
  `).then((r: any) => r.rows[0] || null);
};

const remove = (id: number, userType: string, userId: number, centerId?: number) => {
  if (centerId) {
    return db.execute(sql`
      DELETE FROM notifications
      WHERE notification_id = ${id} AND user_type = ${userType} AND user_id = ${userId} AND center_id = ${centerId}
      RETURNING *
    `).then((r: any) => r.rows[0] || null);
  }
  return db.execute(sql`
    DELETE FROM notifications
    WHERE notification_id = ${id} AND user_type = ${userType} AND user_id = ${userId}
    RETURNING *
  `).then((r: any) => r.rows[0] || null);
};

module.exports = { findByUser, insert, markRead, remove };

export {};
