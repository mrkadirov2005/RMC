module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_no_session
        ON attendance (student_id, class_id, attendance_date)
        WHERE session_id IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS uniq_attendance_session
        ON attendance (student_id, session_id)
        WHERE session_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uniq_attendance_session;
      DROP INDEX IF EXISTS uniq_attendance_no_session;
    `);
  },
};
