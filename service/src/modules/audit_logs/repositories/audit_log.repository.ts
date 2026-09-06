const { and, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { auditLogs } = require('../../../db/schema');

const db = pool.db;

const findFiltered = (filters: { entityType?: string; entityId?: number; userType?: string; userId?: number; centerId?: number } = {}, limit?: number, offset?: number) => {
  const conditions: any[] = [];
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
  if (filters.userType) conditions.push(eq(auditLogs.userType, filters.userType));
  if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
  if (filters.centerId) {
    conditions.push(sql`COALESCE(${auditLogs.centerId}, (${auditLogs.details}->>'center_id')::int) = ${filters.centerId}`);
  }

  let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));
  if (conditions.length) query = query.where(and(...conditions));
  if (limit != null) query = query.limit(limit);
  if (offset != null) query = query.offset(offset);
  return query;
};

module.exports = { findFiltered };

export {};
