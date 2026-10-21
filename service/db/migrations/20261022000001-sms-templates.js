'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The owner's own wording for each SMS type (payment_success, payment_waiting, attendance),
      -- with placeholders such as {ism}. The active one of a type is used for every send; with
      -- none active the built-in text is used.
      CREATE TABLE IF NOT EXISTS sms_templates (
        template_id SERIAL PRIMARY KEY,
        kind VARCHAR(40) NOT NULL,
        name VARCHAR(120) NOT NULL,
        body TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sms_templates_one_active ON sms_templates (kind) WHERE is_active;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS sms_templates;');
  },
};
