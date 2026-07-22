const pool = require('../../../db/pool');
const { db } = pool;
const { and, desc, eq } = require('drizzle-orm');
const { notifications } = require('../../../db/schema');

const findByUser = (userType: string, userId: number, centerId?: number) => {
  const filters = [eq(notifications.userType, userType), eq(notifications.userId, userId)];
  if (centerId) filters.push(eq(notifications.centerId, centerId));
  return db.select().from(notifications).where(and(...filters)).orderBy(desc(notifications.createdAt));
};

const insert = (params: any[]) =>
  db
    .insert(notifications)
    .values({
      centerId: params[0],
      userType: params[1],
      userId: params[2],
      title: params[3],
      message: params[4],
      type: params[5],
    })
    .returning()
    .then((rows: any[]) => rows[0]);

const markRead = (id: number, userType: string, userId: number, centerId?: number) => {
  const filters = [eq(notifications.notificationId, id), eq(notifications.userType, userType), eq(notifications.userId, userId)];
  if (centerId) filters.push(eq(notifications.centerId, centerId));
  return db.update(notifications).set({ isRead: true }).where(and(...filters)).returning().then((rows: any[]) => rows[0] || null);
};

const remove = (id: number, userType: string, userId: number, centerId?: number) => {
  const filters = [eq(notifications.notificationId, id), eq(notifications.userType, userType), eq(notifications.userId, userId)];
  if (centerId) filters.push(eq(notifications.centerId, centerId));
  return db.delete(notifications).where(and(...filters)).returning().then((rows: any[]) => rows[0] || null);
};

module.exports = { findByUser, insert, markRead, remove };

export {};
