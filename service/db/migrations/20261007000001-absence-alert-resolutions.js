module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- How an admin closed a "missed lessons in a row" alert for a student in a group. The alert
      -- reopens only for absences after resolved_through. outcome is one of: sick (the student is
      -- also frozen), not_interested, excused, left.
      CREATE TABLE IF NOT EXISTS absence_alert_resolutions (
        resolution_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        student_id INTEGER NOT NULL,
        class_id INTEGER,
        resolved_through DATE NOT NULL,
        outcome VARCHAR(40) NOT NULL,
        note TEXT,
        resolved_by_id INTEGER,
        resolved_by_type VARCHAR(20),
        resolved_by_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_absence_alert_resolutions_student
        ON absence_alert_resolutions (student_id, class_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS absence_alert_resolutions;');
  },
};
