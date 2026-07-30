module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE sessions
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Scheduled';

      UPDATE sessions
      SET status = 'Scheduled'
      WHERE status IS NULL;

      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sessions_status;

      ALTER TABLE sessions
        DROP COLUMN IF EXISTS status;
    `);
  },
};
