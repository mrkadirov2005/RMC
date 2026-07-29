const { and, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { centers, superusers } = require('../../../db/schema');

const db = pool.db;

const safeSelection = {
  superuser_id: superusers.superuserId,
  center_id: superusers.centerId,
  username: superusers.username,
  email: superusers.email,
  first_name: superusers.firstName,
  last_name: superusers.lastName,
  role: superusers.role,
  permissions: superusers.permissions,
  status: superusers.status,
  last_login: superusers.lastLogin,
  created_at: superusers.createdAt,
  updated_at: superusers.updatedAt,
};

const scoped = (id?: number, centerId?: number) => {
  const conditions: any[] = [];
  if (id) conditions.push(eq(superusers.superuserId, id));
  if (centerId) conditions.push(eq(superusers.centerId, centerId));
  return conditions;
};

const findAllSafe = (centerId?: number) => {
  let query = db.select(safeSelection).from(superusers).orderBy(desc(superusers.superuserId));
  if (centerId) query = query.where(eq(superusers.centerId, centerId));
  return query;
};

const findById = async (id: number, centerId?: number) => {
  const rows = await db.select(safeSelection).from(superusers).where(and(...scoped(id, centerId))).limit(1);
  return rows[0] || null;
};

const firstCenterId = async () => {
  const rows = await db.select({ center_id: centers.centerId }).from(centers).limit(1);
  return rows[0]?.center_id;
};

const countByUsername = async (username: string) => {
  const rows = await db.select({ superuser_id: superusers.superuserId }).from(superusers).where(eq(superusers.username, username));
  return rows.length;
};

const insert = async (params: any[]) => {
  const rows = await db
    .insert(superusers)
    .values({
      centerId: params[0],
      username: params[1],
      email: params[2],
      passwordHash: params[3],
      firstName: params[4],
      lastName: params[5],
      role: params[6],
      permissions: params[7],
      status: params[8],
    })
    .returning({
      superuser_id: superusers.superuserId,
      center_id: superusers.centerId,
      username: superusers.username,
      email: superusers.email,
      first_name: superusers.firstName,
      last_name: superusers.lastName,
      role: superusers.role,
      permissions: superusers.permissions,
      status: superusers.status,
      created_at: superusers.createdAt,
    });
  return rows[0];
};

const update = async (id: number, params: any[], centerId?: number) => {
  const rows = await db
    .update(superusers)
    .set({
      email: sql`COALESCE(${params[0] ?? null}, ${superusers.email})`,
      firstName: sql`COALESCE(${params[1] ?? null}, ${superusers.firstName})`,
      lastName: sql`COALESCE(${params[2] ?? null}, ${superusers.lastName})`,
      role: sql`COALESCE(${params[3] ?? null}, ${superusers.role})`,
      permissions: sql`COALESCE(${params[4] ?? null}, ${superusers.permissions})`,
      status: sql`COALESCE(${params[5] ?? null}, ${superusers.status})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(and(...scoped(id, centerId)))
    .returning({
      superuser_id: superusers.superuserId,
      center_id: superusers.centerId,
      username: superusers.username,
      email: superusers.email,
      first_name: superusers.firstName,
      last_name: superusers.lastName,
      role: superusers.role,
      permissions: superusers.permissions,
      status: superusers.status,
      updated_at: superusers.updatedAt,
    });
  return rows[0] || null;
};

const remove = async (id: number, centerId?: number) => {
  const rows = await db.delete(superusers).where(and(...scoped(id, centerId))).returning({
    superuser_id: superusers.superuserId,
    username: superusers.username,
    email: superusers.email,
  });
  return rows[0] || null;
};

const findByUsernameForLogin = async (username: string) => {
  const rows = await db
    .select({
      superuser_id: superusers.superuserId,
      center_id: superusers.centerId,
      username: superusers.username,
      email: superusers.email,
      first_name: superusers.firstName,
      last_name: superusers.lastName,
      role: superusers.role,
      permissions: superusers.permissions,
      password_hash: superusers.passwordHash,
      status: superusers.status,
      is_locked: superusers.isLocked,
    })
    .from(superusers)
    .where(eq(superusers.username, username))
    .limit(1);
  return rows[0] || null;
};

const incrementLoginAttempts = (id: number) =>
  db.update(superusers).set({ loginAttempts: sql`${superusers.loginAttempts} + 1` }).where(eq(superusers.superuserId, id));

const resetLoginSuccess = (id: number) =>
  db.update(superusers).set({ loginAttempts: 0, lastLogin: sql`CURRENT_TIMESTAMP` }).where(eq(superusers.superuserId, id));

const findPasswordHash = async (id: number) => {
  const rows = await db.select({ password_hash: superusers.passwordHash }).from(superusers).where(eq(superusers.superuserId, id)).limit(1);
  return rows[0]?.password_hash;
};

const updatePasswordHash = (id: number, password_hash: string) =>
  db.update(superusers).set({ passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(superusers.superuserId, id));

module.exports = {
  findAllSafe,
  findById,
  firstCenterId,
  countByUsername,
  insert,
  update,
  remove,
  findByUsernameForLogin,
  incrementLoginAttempts,
  resetLoginSuccess,
  findPasswordHash,
  updatePasswordHash,
};

export {};
