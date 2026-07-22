const pool = require('../../../db/pool');
const { db } = pool;
const { and, desc, eq, sql } = require('drizzle-orm');
const { savedFilters } = require('../../../db/schema');

const findForUser = (userType: string, userId: number, centerId?: number, entity?: string) => {
  const filters = [eq(savedFilters.userType, userType), eq(savedFilters.userId, userId)];
  if (centerId) filters.push(eq(savedFilters.centerId, centerId));
  if (entity) filters.push(eq(savedFilters.entity, entity));
  return db.select().from(savedFilters).where(and(...filters)).orderBy(desc(savedFilters.updatedAt));
};

const insert = (params: any[]) =>
  db
    .insert(savedFilters)
    .values({
      centerId: params[0],
      userType: params[1],
      userId: params[2],
      name: params[3],
      entity: params[4],
      filtersJson: params[5],
    })
    .returning()
    .then((rows: any[]) => rows[0]);

const update = (id: number, userType: string, userId: number, centerId: number, name: any, filtersJson: string | null) =>
  db
    .update(savedFilters)
    .set({
      name: sql`COALESCE(${name}, ${savedFilters.name})`,
      filtersJson: sql`COALESCE(${filtersJson}, ${savedFilters.filtersJson})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(
      eq(savedFilters.filterId, id),
      eq(savedFilters.userType, userType),
      eq(savedFilters.userId, userId),
      eq(savedFilters.centerId, centerId)
    ))
    .returning()
    .then((rows: any[]) => rows[0] || null);

const remove = (id: number, userType: string, userId: number, centerId: number) =>
  db
    .delete(savedFilters)
    .where(and(
      eq(savedFilters.filterId, id),
      eq(savedFilters.userType, userType),
      eq(savedFilters.userId, userId),
      eq(savedFilters.centerId, centerId)
    ))
    .returning()
    .then((rows: any[]) => rows[0] || null);

module.exports = { findForUser, insert, update, remove };

export {};
