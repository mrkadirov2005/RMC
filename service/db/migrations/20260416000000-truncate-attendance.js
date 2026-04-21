module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query('TRUNCATE attendance RESTART IDENTITY');
  },

  async down() {
    // No rollback for truncate.
  },
};
