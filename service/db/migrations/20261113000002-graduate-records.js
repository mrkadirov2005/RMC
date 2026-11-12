'use strict';

// Graduates' records: a certificate, a university admission or a thank-you note, with the date it
// was received and either a file (PDF, or a screenshot for a thank-you) or a link.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE student_certificates
        ADD COLUMN IF NOT EXISTS kind varchar(20) NOT NULL DEFAULT 'certificate',
        ADD COLUMN IF NOT EXISTS received_on date,
        ADD COLUMN IF NOT EXISTS link_url text,
        ADD COLUMN IF NOT EXISTS note text,
        ADD COLUMN IF NOT EXISTS content_type varchar(50),
        ALTER COLUMN file_name DROP NOT NULL,
        ALTER COLUMN file_size DROP NOT NULL,
        ALTER COLUMN file_data DROP NOT NULL;
      UPDATE student_certificates SET received_on = created_at::date WHERE received_on IS NULL;
      UPDATE student_certificates SET content_type = 'application/pdf' WHERE content_type IS NULL AND file_data IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE student_certificates
        DROP COLUMN IF EXISTS kind,
        DROP COLUMN IF EXISTS received_on,
        DROP COLUMN IF EXISTS link_url,
        DROP COLUMN IF EXISTS note,
        DROP COLUMN IF EXISTS content_type;
    `);
  },
};
