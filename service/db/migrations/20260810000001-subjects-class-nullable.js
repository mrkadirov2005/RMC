module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE subjects ALTER COLUMN class_id DROP NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE subjects ALTER COLUMN class_id SET NOT NULL;
    `);
  },
};
