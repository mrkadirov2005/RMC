const { and, desc, eq, isNull, sql } = require('drizzle-orm');
const pool = require('../../../db/pool');
const { mobileSessions, mobileRefreshTokens } = require('../../../db/mobileSchema');

const db = pool.db;

const sessionSelection = {
  session_id: mobileSessions.sessionId,
  user_type: mobileSessions.userType,
  user_id: mobileSessions.userId,
  center_id: mobileSessions.centerId,
  device_id: mobileSessions.deviceId,
  device_name: mobileSessions.deviceName,
  platform: mobileSessions.platform,
  app_version: mobileSessions.appVersion,
  created_at: mobileSessions.createdAt,
  last_used_at: mobileSessions.lastUsedAt,
  revoked_at: mobileSessions.revokedAt,
};

const withTransaction = (callback: (tx: any) => Promise<any>) => db.transaction(callback);

// @MOB-022 Signing in again on the same device replaces that device's earlier session.
const createSession = async (tx: any, session: any) => {
  await revokeDeviceSessions(tx, session.userType, session.userId, session.deviceId);
  const rows = await tx
    .insert(mobileSessions)
    .values({
      userType: session.userType,
      userId: session.userId,
      centerId: session.centerId ?? null,
      deviceId: session.deviceId,
      deviceName: session.deviceName ?? null,
      platform: session.platform ?? null,
      appVersion: session.appVersion ?? null,
      createdAt: sql`CURRENT_TIMESTAMP`,
      lastUsedAt: sql`CURRENT_TIMESTAMP`,
    })
    .returning(sessionSelection);
  return rows[0];
};

const revokeDeviceSessions = async (tx: any, userType: string, userId: number, deviceId: string) => {
  const rows = await tx
    .update(mobileSessions)
    .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
    .where(
      and(
        eq(mobileSessions.userType, userType),
        eq(mobileSessions.userId, userId),
        eq(mobileSessions.deviceId, deviceId),
        isNull(mobileSessions.revokedAt),
      ),
    )
    .returning({ session_id: mobileSessions.sessionId });
  for (const row of rows) await revokeSessionTokens(tx, row.session_id);
};

const insertRefreshToken = (tx: any, sessionId: number, tokenHash: string, expiresAt: Date) =>
  tx.insert(mobileRefreshTokens).values({ sessionId, tokenHash, expiresAt, createdAt: sql`CURRENT_TIMESTAMP` });

// @MOB-023 Locks the token row so two refreshes of the same token cannot both succeed.
const findRefreshTokenForUpdate = async (tx: any, tokenHash: string) => {
  const rows = await tx
    .select({
      token_id: mobileRefreshTokens.tokenId,
      session_id: mobileRefreshTokens.sessionId,
      expires_at: mobileRefreshTokens.expiresAt,
      used_at: mobileRefreshTokens.usedAt,
      revoked_at: mobileRefreshTokens.revokedAt,
      session_revoked_at: mobileSessions.revokedAt,
      user_type: mobileSessions.userType,
      user_id: mobileSessions.userId,
      center_id: mobileSessions.centerId,
    })
    .from(mobileRefreshTokens)
    .innerJoin(mobileSessions, eq(mobileSessions.sessionId, mobileRefreshTokens.sessionId))
    .where(eq(mobileRefreshTokens.tokenHash, tokenHash))
    .for('update');
  return rows[0] || null;
};

const markTokenUsed = (tx: any, tokenId: number) =>
  tx.update(mobileRefreshTokens).set({ usedAt: sql`CURRENT_TIMESTAMP` }).where(eq(mobileRefreshTokens.tokenId, tokenId));

const touchSession = (tx: any, sessionId: number) =>
  tx.update(mobileSessions).set({ lastUsedAt: sql`CURRENT_TIMESTAMP` }).where(eq(mobileSessions.sessionId, sessionId));

const revokeSessionTokens = (tx: any, sessionId: number) =>
  tx
    .update(mobileRefreshTokens)
    .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(mobileRefreshTokens.sessionId, sessionId), isNull(mobileRefreshTokens.revokedAt)));

const revokeSession = async (tx: any, sessionId: number) => {
  await tx
    .update(mobileSessions)
    .set({ revokedAt: sql`CURRENT_TIMESTAMP` })
    .where(and(eq(mobileSessions.sessionId, sessionId), isNull(mobileSessions.revokedAt)));
  await revokeSessionTokens(tx, sessionId);
};

const findActiveSession = async (sessionId: number) => {
  const rows = await db
    .select(sessionSelection)
    .from(mobileSessions)
    .where(and(eq(mobileSessions.sessionId, sessionId), isNull(mobileSessions.revokedAt)));
  return rows[0] || null;
};

// @MOB-023 Active devices of one user, most recently used first.
const listActiveSessions = (userType: string, userId: number) =>
  db
    .select(sessionSelection)
    .from(mobileSessions)
    .where(and(eq(mobileSessions.userType, userType), eq(mobileSessions.userId, userId), isNull(mobileSessions.revokedAt)))
    .orderBy(desc(mobileSessions.lastUsedAt));

const findUserSession = async (userType: string, userId: number, sessionId: number) => {
  const rows = await db
    .select(sessionSelection)
    .from(mobileSessions)
    .where(
      and(
        eq(mobileSessions.sessionId, sessionId),
        eq(mobileSessions.userType, userType),
        eq(mobileSessions.userId, userId),
        isNull(mobileSessions.revokedAt),
      ),
    );
  return rows[0] || null;
};

module.exports = {
  withTransaction,
  createSession,
  insertRefreshToken,
  findRefreshTokenForUpdate,
  markTokenUsed,
  touchSession,
  revokeSession,
  findActiveSession,
  listActiveSessions,
  findUserSession,
};

export {};
