module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS attendance (
          attendance_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          teacher_id INT NOT NULL,
          class_id INT NOT NULL,
          attendance_date DATE NOT NULL,
          status attendance_status DEFAULT 'Present',
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
          FOREIGN KEY (class_id) REFERENCES classes(class_id)
      );

        CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

        CREATE TABLE IF NOT EXISTS grades (
          grade_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          teacher_id INT NOT NULL,
          subject VARCHAR(100),
          class_id INT,
          marks_obtained DECIMAL(6,2),
          total_marks INT DEFAULT 100,
          percentage DECIMAL(5,2),
          grade_letter VARCHAR(5),
          academic_year INT,
          term VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
      );

      CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_grades_academic_year ON grades(academic_year);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS grades CASCADE;
      DROP TABLE IF EXISTS attendance CASCADE;
    `);
  },
};
