// The developer account: an owner row flagged is_developer, hidden from and untouchable by owners.
// developer_locks holds the locks only the developer sets or lifts: one row per locked account
// (user_type owner/superuser/teacher/student/parent), or ('all', 0) to lock everyone but the developer.
// owners.locked_at lets a password lockout lift itself after a while.

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS is_developer BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS developer_locks (
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER NOT NULL,
        reason TEXT,
        locked_by INTEGER,
        locked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_type, user_id)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS developer_locks;
      ALTER TABLE owners DROP COLUMN IF EXISTS locked_at;
      ALTER TABLE owners DROP COLUMN IF EXISTS is_developer;
    `);
  },
};
