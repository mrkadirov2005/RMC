module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        ADD COLUMN IF NOT EXISTS attendance_score INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS homework_score INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS activity_score INT DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        DROP COLUMN IF EXISTS activity_score,
        DROP COLUMN IF EXISTS homework_score,
        DROP COLUMN IF EXISTS attendance_score;
    `);
  },
};
