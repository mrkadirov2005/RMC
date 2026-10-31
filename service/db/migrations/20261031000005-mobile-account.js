module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-024 Password reset codes sent by SMS. Only a SHA-256 of the code is kept; a code works
      -- once, for 10 minutes, and is spent after 5 wrong tries.
      CREATE TABLE IF NOT EXISTS mobile_password_resets (
        reset_id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'parent')),
        user_id INTEGER NOT NULL,
        phone VARCHAR(30) NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_password_resets_user ON mobile_password_resets (user_type, user_id, created_at DESC);

      -- @MOB-032 Link requests also come from the app: the parent is already known, there is no
      -- Telegram chat. The bot's requests are unchanged.
      ALTER TABLE parent_link_requests ALTER COLUMN telegram_chat_id DROP NOT NULL;
      ALTER TABLE parent_link_requests ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'telegram';
      ALTER TABLE parent_link_requests ADD COLUMN IF NOT EXISTS requested_by_parent_id INTEGER;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_parent_link_requests_app_pending
        ON parent_link_requests (requested_by_parent_id, student_id) WHERE status = 'Pending' AND requested_by_parent_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ux_parent_link_requests_app_pending;
      DELETE FROM parent_link_requests WHERE telegram_chat_id IS NULL;
      ALTER TABLE parent_link_requests DROP COLUMN IF EXISTS requested_by_parent_id;
      ALTER TABLE parent_link_requests DROP COLUMN IF EXISTS source;
      ALTER TABLE parent_link_requests ALTER COLUMN telegram_chat_id SET NOT NULL;
      DROP TABLE IF EXISTS mobile_password_resets;
    `);
  },
};
