const { and, desc, eq, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { owners } = require('../../../db/schema');

const db = pool.db;

const safeSelection = {
  owner_id: owners.ownerId,
  username: owners.username,
  email: owners.email,
  first_name: owners.firstName,
  last_name: owners.lastName,
  status: owners.status,
  last_login: owners.lastLogin,
  created_at: owners.createdAt,
  updated_at: owners.updatedAt,
};

// Developer accounts are left out unless the caller is a developer: owners never see them.
const notDeveloper = sql`COALESCE(${owners.isDeveloper}, FALSE) = FALSE`;

const findAllSafe = (includeDevelopers = false) =>
  db
    .select({ ...safeSelection, is_developer: owners.isDeveloper, is_locked: owners.isLocked })
    .from(owners)
    .where(includeDevelopers ? sql`TRUE` : notDeveloper)
    .orderBy(desc(owners.ownerId));

const findById = async (id: number, includeDevelopers = false) => {
  const rows = await db
    .select(safeSelection)
    .from(owners)
    .where(includeDevelopers ? eq(owners.ownerId, id) : and(eq(owners.ownerId, id), notDeveloper))
    .limit(1);
  return rows[0] || null;
};

const isDeveloper = async (id: number) => {
  const rows = await db.select({ is_developer: owners.isDeveloper }).from(owners).where(eq(owners.ownerId, id)).limit(1);
  return Boolean(rows[0]?.is_developer);
};

const countByUsername = async (username: string) => {
  const rows = await db.select({ owner_id: owners.ownerId }).from(owners).where(eq(owners.username, username));
  return rows.length;
};

const insert = async (params: any[]) => {
  const rows = await db
    .insert(owners)
    .values({
      username: params[0],
      email: params[1],
      passwordHash: params[2],
      firstName: params[3],
      lastName: params[4],
      status: params[5],
    })
    .returning({
      owner_id: owners.ownerId,
      username: owners.username,
      email: owners.email,
      first_name: owners.firstName,
      last_name: owners.lastName,
      status: owners.status,
      created_at: owners.createdAt,
    });
  return rows[0];
};

const update = async (id: number, params: any[]) => {
  const rows = await db
    .update(owners)
    .set({
      email: sql`COALESCE(${params[0] ?? null}, ${owners.email})`,
      firstName: sql`COALESCE(${params[1] ?? null}, ${owners.firstName})`,
      lastName: sql`COALESCE(${params[2] ?? null}, ${owners.lastName})`,
      status: sql`COALESCE(${params[3] ?? null}, ${owners.status})`,
      passwordHash: sql`COALESCE(${params[4] ?? null}, ${owners.passwordHash})`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(eq(owners.ownerId, id))
    .returning({
      owner_id: owners.ownerId,
      username: owners.username,
      email: owners.email,
      first_name: owners.firstName,
      last_name: owners.lastName,
      status: owners.status,
      updated_at: owners.updatedAt,
    });
  return rows[0] || null;
};

const remove = async (id: number) => {
  const rows = await db.delete(owners).where(eq(owners.ownerId, id)).returning({
    owner_id: owners.ownerId,
    username: owners.username,
    email: owners.email,
  });
  return rows[0] || null;
};

const findByUsernameForLogin = async (username: string) => {
  const rows = await db
    .select({
      owner_id: owners.ownerId,
      username: owners.username,
      email: owners.email,
      first_name: owners.firstName,
      last_name: owners.lastName,
      password_hash: owners.passwordHash,
      status: owners.status,
      is_locked: owners.isLocked,
      locked_at: owners.lockedAt,
      can_hard_delete: owners.canHardDelete,
      is_developer: owners.isDeveloper,
    })
    .from(owners)
    .where(eq(owners.username, username))
    .limit(1);
  return rows[0] || null;
};

const LOGIN_ATTEMPTS_LOCK_THRESHOLD = 5;

const incrementLoginAttempts = (id: number) =>
  db
    .update(owners)
    .set({
      loginAttempts: sql`COALESCE(${owners.loginAttempts}, 0) + 1`,
      isLocked: sql`CASE WHEN COALESCE(${owners.loginAttempts}, 0) + 1 >= ${LOGIN_ATTEMPTS_LOCK_THRESHOLD} THEN TRUE ELSE ${owners.isLocked} END`,
      lockedAt: sql`CASE WHEN COALESCE(${owners.loginAttempts}, 0) + 1 >= ${LOGIN_ATTEMPTS_LOCK_THRESHOLD} THEN CURRENT_TIMESTAMP ELSE ${owners.lockedAt} END`,
    })
    .where(eq(owners.ownerId, id));

const unlock = (id: number) =>
  db.update(owners).set({ isLocked: false, loginAttempts: 0, lockedAt: null }).where(eq(owners.ownerId, id));

const resetLoginSuccess = (id: number) =>
  db.update(owners).set({ loginAttempts: 0, lastLogin: sql`CURRENT_TIMESTAMP` }).where(eq(owners.ownerId, id));

const findPasswordHash = async (id: number) => {
  const rows = await db.select({ password_hash: owners.passwordHash }).from(owners).where(eq(owners.ownerId, id)).limit(1);
  return rows[0]?.password_hash;
};

const updatePasswordHash = (id: number, password_hash: string) =>
  db.update(owners).set({ passwordHash: password_hash, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(owners.ownerId, id));

module.exports = {
  findAllSafe,
  findById,
  isDeveloper,
  countByUsername,
  insert,
  update,
  remove,
  findByUsernameForLogin,
  incrementLoginAttempts,
  unlock,
  resetLoginSuccess,
  findPasswordHash,
  updatePasswordHash,
};

export {};
