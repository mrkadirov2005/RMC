module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id SERIAL PRIMARY KEY,
        center_id INT NOT NULL,
        class_id INT NOT NULL,
        teacher_id INT,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        duration_minutes INT NOT NULL,
        end_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
        FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
        FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_class_date_time
        ON sessions (class_id, session_date, start_time);
      CREATE INDEX IF NOT EXISTS idx_sessions_class_id ON sessions(class_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
      CREATE INDEX IF NOT EXISTS idx_sessions_center_id ON sessions(center_id);

      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS session_id INT;
      ALTER TABLE attendance
        ADD CONSTRAINT fk_attendance_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_session_id ON attendance(session_id);

      ALTER TABLE grades ADD COLUMN IF NOT EXISTS session_id INT;
      ALTER TABLE grades
        ADD CONSTRAINT fk_grades_session
        FOREIGN KEY (session_id) REFERENCES sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_grades_session_id ON grades(session_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades DROP CONSTRAINT IF EXISTS fk_grades_session;
      ALTER TABLE grades DROP COLUMN IF EXISTS session_id;
      DROP INDEX IF EXISTS idx_grades_session_id;

      ALTER TABLE attendance DROP CONSTRAINT IF EXISTS fk_attendance_session;
      ALTER TABLE attendance DROP COLUMN IF EXISTS session_id;
      DROP INDEX IF EXISTS idx_attendance_session_id;

      DROP INDEX IF EXISTS ux_sessions_class_date_time;
      DROP INDEX IF EXISTS idx_sessions_class_id;
      DROP INDEX IF EXISTS idx_sessions_date;
      DROP INDEX IF EXISTS idx_sessions_center_id;
      DROP TABLE IF EXISTS sessions CASCADE;
    `);
  },
};
