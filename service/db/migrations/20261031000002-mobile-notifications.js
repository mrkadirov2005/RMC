module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-041 Push notifications for the mobile app. Each row is one message to one user; it
      -- is pushed to every signed-in device of that user and doubles as their in-app inbox.
      CREATE TABLE IF NOT EXISTS mobile_notification_outbox (
        outbox_id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'parent')),
        user_id INTEGER NOT NULL,
        category VARCHAR(30) NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        data JSONB,
        dedupe_key VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'no_device')),
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        read_at TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_notification_dedupe ON mobile_notification_outbox (dedupe_key);
      CREATE INDEX IF NOT EXISTS idx_mobile_notification_due ON mobile_notification_outbox (next_attempt_at) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_mobile_notification_user ON mobile_notification_outbox (user_type, user_id, outbox_id DESC);

      -- @MOB-043 Categories a user turned off. No row means on.
      CREATE TABLE IF NOT EXISTS mobile_notification_prefs (
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER NOT NULL,
        category VARCHAR(30) NOT NULL,
        enabled BOOLEAN NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_type, user_id, category)
      );

      -- @MOB-042 How far each event watcher has read (last id seen per source table).
      CREATE TABLE IF NOT EXISTS mobile_event_checkpoints (
        name VARCHAR(50) PRIMARY KEY,
        last_id INTEGER NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS mobile_event_checkpoints;
      DROP TABLE IF EXISTS mobile_notification_prefs;
      DROP TABLE IF EXISTS mobile_notification_outbox;
    `);
  },
};
