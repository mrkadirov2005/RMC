module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ux_students_enrollment_number_active;
      DROP INDEX IF EXISTS ux_students_username_active;

      CREATE UNIQUE INDEX ux_students_enrollment_number_active
        ON students(enrollment_number)
        WHERE deleted_at IS NULL AND status IS DISTINCT FROM 'Transferred';

      CREATE UNIQUE INDEX ux_students_username_active
        ON students(username)
        WHERE username IS NOT NULL AND deleted_at IS NULL AND status IS DISTINCT FROM 'Transferred';
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE students
      SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
      WHERE status = 'Transferred';

      DROP INDEX IF EXISTS ux_students_enrollment_number_active;
      DROP INDEX IF EXISTS ux_students_username_active;

      CREATE UNIQUE INDEX ux_students_enrollment_number_active
        ON students(enrollment_number)
        WHERE deleted_at IS NULL;

      CREATE UNIQUE INDEX ux_students_username_active
        ON students(username)
        WHERE username IS NOT NULL AND deleted_at IS NULL;
    `);
  },
};
