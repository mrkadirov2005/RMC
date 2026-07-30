module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance
        ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE attendance
        DROP COLUMN IF EXISTS notes;
    `);
  },
};
