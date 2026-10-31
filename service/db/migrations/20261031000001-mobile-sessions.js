module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-021 Mobile app sign-ins: one row per device, with rotating refresh tokens.
      -- A student or parent signed in on two phones has two sessions; signing out one leaves the other.
      CREATE TABLE IF NOT EXISTS mobile_sessions (
        session_id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'parent')),
        user_id INTEGER NOT NULL,
        center_id INTEGER,
        device_id VARCHAR(100) NOT NULL,
        device_name VARCHAR(150),
        platform VARCHAR(20) CHECK (platform IS NULL OR platform IN ('ios', 'android', 'web')),
        app_version VARCHAR(30),
        push_token TEXT,
        push_token_updated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_sessions_user ON mobile_sessions (user_type, user_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_sessions_active_device
        ON mobile_sessions (user_type, user_id, device_id) WHERE revoked_at IS NULL;

      -- Only a SHA-256 of each refresh token is stored. A token is used once; presenting a used
      -- token again means it leaked, and the whole session is revoked.
      CREATE TABLE IF NOT EXISTS mobile_refresh_tokens (
        token_id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES mobile_sessions(session_id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_refresh_tokens_hash ON mobile_refresh_tokens (token_hash);
      CREATE INDEX IF NOT EXISTS idx_mobile_refresh_tokens_session ON mobile_refresh_tokens (session_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS mobile_refresh_tokens;
      DROP TABLE IF EXISTS mobile_sessions;
    `);
  },
};
