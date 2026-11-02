// Tables used only by the mobile app API (/api/mobile/v1). Kept apart from schema.ts so the
// mobile work adds files instead of editing the shared schema.
const { integer, pgTable, serial, text, timestamp, varchar } = require('drizzle-orm/pg-core');

// @MOB-021 One row per signed-in device.
const mobileSessions = pgTable('mobile_sessions', {
  sessionId: serial('session_id').primaryKey(),
  userType: varchar('user_type', { length: 20 }).notNull(),
  userId: integer('user_id').notNull(),
  centerId: integer('center_id'),
  deviceId: varchar('device_id', { length: 100 }).notNull(),
  deviceName: varchar('device_name', { length: 150 }),
  platform: varchar('platform', { length: 20 }),
  appVersion: varchar('app_version', { length: 30 }),
  pushToken: text('push_token'),
  pushTokenUpdatedAt: timestamp('push_token_updated_at'),
  createdAt: timestamp('created_at'),
  lastUsedAt: timestamp('last_used_at'),
  revokedAt: timestamp('revoked_at'),
});

// @MOB-021 Hashed, single-use refresh tokens of a session.
const mobileRefreshTokens = pgTable('mobile_refresh_tokens', {
  tokenId: serial('token_id').primaryKey(),
  sessionId: integer('session_id').notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at'),
});

module.exports = { mobileSessions, mobileRefreshTokens };

export {};
