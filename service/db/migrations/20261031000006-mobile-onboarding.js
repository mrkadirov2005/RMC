module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-112 First-run onboarding, one row per user. It is optional: finishing or skipping only
      -- stops the app from showing it again.
      CREATE TABLE IF NOT EXISTS mobile_onboarding (
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'parent')),
        user_id INTEGER NOT NULL,
        completed_at TIMESTAMP,
        skipped BOOLEAN NOT NULL DEFAULT false,
        telegram_verified_at TIMESTAMP,
        -- Instagram cannot be checked; this only records that the user opened the page.
        instagram_opened_at TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_type, user_id)
      );

      -- @MOB-112 Consents about a student (e.g. being filmed in lessons). Rows are never updated:
      -- the newest row for a student and kind is the answer in force, older rows are the history.
      CREATE TABLE IF NOT EXISTS mobile_consents (
        consent_id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL,
        kind VARCHAR(30) NOT NULL,
        granted BOOLEAN NOT NULL,
        given_by_type VARCHAR(20) NOT NULL CHECK (given_by_type IN ('student', 'parent')),
        given_by_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_consents_student ON mobile_consents (student_id, kind, created_at DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS mobile_consents;
      DROP TABLE IF EXISTS mobile_onboarding;
    `);
  },
};
