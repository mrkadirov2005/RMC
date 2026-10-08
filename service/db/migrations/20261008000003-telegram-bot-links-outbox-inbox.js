module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Which Telegram chat follows which student. A student logs in themselves; a parent links by
      -- sharing their phone number, which matches the child's parent phone. One chat can follow
      -- several children, and a child can be followed by several chats. student_id is the
      -- child's main record.
      CREATE TABLE IF NOT EXISTS telegram_links (
        link_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER NOT NULL,
        telegram_chat_id BIGINT NOT NULL,
        telegram_user_id BIGINT,
        role VARCHAR(20) NOT NULL,
        phone VARCHAR(30),
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_telegram_links_chat_student ON telegram_links (telegram_chat_id, student_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_links_student ON telegram_links (student_id) WHERE active;

      -- Messages the platform wants delivered (lesson results, teacher feedback, payment
      -- reminders). The bot sends each to every active chat linked to the student, then marks it.
      CREATE TABLE IF NOT EXISTS telegram_outbox (
        message_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER NOT NULL,
        kind VARCHAR(40) NOT NULL,
        text TEXT NOT NULL,
        created_by_id INTEGER,
        created_by_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        delivered_count INTEGER,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_telegram_outbox_pending ON telegram_outbox (message_id) WHERE sent_at IS NULL;

      -- What students and parents send from the bot: suggestions and complaints to the director,
      -- and messages to the child's teacher. Read in the platform.
      CREATE TABLE IF NOT EXISTS telegram_inbox (
        inbox_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER,
        teacher_id INTEGER,
        telegram_chat_id BIGINT NOT NULL,
        sender_role VARCHAR(20),
        sender_name VARCHAR(200),
        kind VARCHAR(30) NOT NULL,
        text TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_telegram_inbox_center ON telegram_inbox (center_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_telegram_inbox_teacher ON telegram_inbox (teacher_id, created_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS telegram_inbox; DROP TABLE IF EXISTS telegram_outbox; DROP TABLE IF EXISTS telegram_links;');
  },
};
