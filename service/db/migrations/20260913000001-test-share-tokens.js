module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        ALTER TABLE tests ADD COLUMN IF NOT EXISTS share_token VARCHAR(64);

        CREATE UNIQUE INDEX IF NOT EXISTS idx_tests_share_token
          ON tests(share_token)
          WHERE share_token IS NOT NULL;

        -- A submission started from a share link has no session behind it, so it
        -- carries its own secret: every later public call must present this token.
        ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS access_token VARCHAR(64);

        CREATE INDEX IF NOT EXISTS idx_test_submissions_access_token
          ON test_submissions(access_token)
          WHERE access_token IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_test_submissions_access_token;
      ALTER TABLE test_submissions DROP COLUMN IF EXISTS access_token;
      DROP INDEX IF EXISTS idx_tests_share_token;
      ALTER TABLE tests DROP COLUMN IF EXISTS share_token;
    `);
  },
};
