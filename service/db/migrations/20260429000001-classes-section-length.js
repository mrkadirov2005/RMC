module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE classes
      ALTER COLUMN section TYPE VARCHAR(50);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE classes
      ALTER COLUMN section TYPE VARCHAR(10);
    `);
  },
};

