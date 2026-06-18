module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE rooms
        ADD COLUMN IF NOT EXISTS end_time TIME;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE rooms
        DROP COLUMN IF EXISTS end_time;
    `);
  },
};
