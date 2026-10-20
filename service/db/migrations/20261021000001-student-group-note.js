// A note written when a child is added to another group (why, what was agreed).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS group_note TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students DROP COLUMN IF EXISTS group_note;
    `);
  },
};
