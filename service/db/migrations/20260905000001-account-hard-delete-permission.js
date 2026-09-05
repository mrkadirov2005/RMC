module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE owners
        ADD COLUMN IF NOT EXISTS can_hard_delete BOOLEAN NOT NULL DEFAULT FALSE;

      ALTER TABLE superusers
        ADD COLUMN IF NOT EXISTS can_hard_delete BOOLEAN NOT NULL DEFAULT FALSE;

      UPDATE owners SET can_hard_delete = TRUE WHERE LOWER(username) = 'muzaffar';
      UPDATE superusers SET can_hard_delete = TRUE WHERE LOWER(username) = 'muzaffar';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE owners DROP COLUMN IF EXISTS can_hard_delete;
      ALTER TABLE superusers DROP COLUMN IF EXISTS can_hard_delete;
    `);
  },
};
