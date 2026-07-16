module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        ADD COLUMN IF NOT EXISTS points_score INT DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        DROP COLUMN IF EXISTS points_score;
    `);
  },
};
