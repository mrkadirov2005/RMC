module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments ALTER COLUMN class_id DROP NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE assignments
      SET class_id = (
        SELECT class_id
        FROM classes
        WHERE classes.center_id = assignments.center_id
        ORDER BY class_id ASC
        LIMIT 1
      )
      WHERE class_id IS NULL;

      ALTER TABLE assignments ALTER COLUMN class_id SET NOT NULL;
    `);
  },
};
