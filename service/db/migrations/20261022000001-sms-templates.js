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
    // The main templates, switched on, worded like the built-in texts so nothing changes until the owner edits them.
    await queryInterface.sequelize.query(`
      INSERT INTO sms_templates (kind, name, body, is_active)
      SELECT kind, name, body, TRUE FROM (VALUES
        ('attendance', 'Davomat ogohlantirishi',
         'Hurmatli ota-ona! Farzandingiz {ism} {guruh} guruhidagi oxirgi {soni} ta darsga kelmadi ({sanalar}). Iltimos, sababini markazga xabar bering.' || E'\\n' || '{markaz}'),
        ('payment_waiting', 'To''lov eslatmasi',
         'Hurmatli ota-ona! {ism} ({guruh}) uchun {oy} to''lovi kutilmoqda: {qoldiq}. Iltimos, to''lovni o''z vaqtida qiling.' || E'\\n' || '{markaz}'),
        ('payment_success', 'To''lov qabul qilindi',
         'Hurmatli ota-ona! {ism} ({guruh}) uchun {oy} to''lovi qabul qilindi: {tolangan}. Qoldiq: {qoldiq}. Rahmat!' || E'\\n' || '{markaz}')
      ) AS main(kind, name, body)
      WHERE NOT EXISTS (SELECT 1 FROM sms_templates);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS sms_templates;');
  },
};
