// The colour a teacher picks in their profile for the top five students of a group (by points over
// all the group's lessons). Empty means the default yellow.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS top_students_color VARCHAR(20);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teachers DROP COLUMN IF EXISTS top_students_color;
    `);
  },
};
