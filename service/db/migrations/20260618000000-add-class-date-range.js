module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE classes
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE classes
        DROP COLUMN IF EXISTS end_date,
        DROP COLUMN IF EXISTS start_date;
    `);
  },
};
