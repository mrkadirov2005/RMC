module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tests
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT FALSE;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE tests
      DROP COLUMN IF EXISTS is_private;
    `);
  },
};
