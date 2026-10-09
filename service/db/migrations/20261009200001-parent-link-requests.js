module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- A parent asking in the Telegram bot to follow a child whose saved parent phone doesn't match
      -- theirs. They give the child's phone or username; an admin approves or rejects the request in
      -- the platform. Approving creates (or reuses) the parent in parents, links the child in
      -- parent_students and the chat in telegram_links.
      CREATE TABLE IF NOT EXISTS parent_link_requests (
        request_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER NOT NULL,
        telegram_chat_id BIGINT NOT NULL,
        telegram_user_id BIGINT,
        telegram_username VARCHAR(100),
        parent_name VARCHAR(200),
        parent_phone VARCHAR(30),
        child_query VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'Pending',
        parent_id INTEGER,
        decided_by_id INTEGER,
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      -- One open request per chat and child, so asking again doesn't pile up duplicates.
      CREATE UNIQUE INDEX IF NOT EXISTS ux_parent_link_requests_pending
        ON parent_link_requests (telegram_chat_id, student_id) WHERE status = 'Pending';
      CREATE INDEX IF NOT EXISTS idx_parent_link_requests_center ON parent_link_requests (center_id, status, created_at DESC);

      -- A message for one chat only (e.g. telling a parent their request was approved) instead of
      -- every chat following the student.
      ALTER TABLE telegram_outbox ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE telegram_outbox DROP COLUMN IF EXISTS telegram_chat_id;
      DROP TABLE IF EXISTS parent_link_requests;
    `);
  },
};
