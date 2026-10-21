module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Text messages to parents, sent by hand by an admin (payment received / payment waiting)
      -- or a teacher (missed lessons in a row), through an Android phone running SMS Gateway with
      -- the center's own SIM card. status: queued, sending, sent (handed to the phone), delivered,
      -- failed, expired.
      CREATE TABLE IF NOT EXISTS sms_outbox (
        sms_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER,
        class_id INTEGER,
        kind VARCHAR(40) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        text TEXT NOT NULL,
        -- The same message (one absence run, one day's payment notice) is queued once however often it is pressed.
        dedupe_key VARCHAR(120) UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TIMESTAMP,
        expires_at TIMESTAMP,
        gateway_id VARCHAR(100),
        error TEXT,
        created_by_id INTEGER,
        created_by_type VARCHAR(20),
        sender_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sent_at TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_sms_outbox_due ON sms_outbox (sms_id) WHERE status = 'queued';
      CREATE INDEX IF NOT EXISTS idx_sms_outbox_created ON sms_outbox (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sms_outbox_center ON sms_outbox (center_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sms_outbox_sent ON sms_outbox (sent_at) WHERE sent_at IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS sms_outbox;');
  },
};
