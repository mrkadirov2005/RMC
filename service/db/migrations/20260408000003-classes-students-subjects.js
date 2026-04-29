module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS classes (
          class_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL,
          class_name VARCHAR(100) NOT NULL,
          class_code VARCHAR(50) NOT NULL UNIQUE,
          level INT,
          section VARCHAR(50),
          capacity INT,
          teacher_id INT,
          room_number VARCHAR(50),
          total_students INT DEFAULT 0,
          payment_amount DECIMAL(12,2),
          payment_frequency payment_frequency DEFAULT 'Monthly',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
      );

        CREATE INDEX IF NOT EXISTS idx_class_code ON classes(class_code);
        CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);

        CREATE TABLE IF NOT EXISTS students (
          student_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL,
          enrollment_number VARCHAR(50) NOT NULL UNIQUE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          username VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255),
          email VARCHAR(100),
          phone VARCHAR(20),
          date_of_birth DATE,
          parent_name VARCHAR(200),
          parent_phone VARCHAR(20),
          gender student_gender,
          status student_status DEFAULT 'Active',
          teacher_id INT,
          class_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id),
          FOREIGN KEY (class_id) REFERENCES classes(class_id)
      );

        CREATE INDEX IF NOT EXISTS idx_enrollment_number ON students(enrollment_number);
        CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
        CREATE INDEX IF NOT EXISTS idx_students_teacher_id ON students(teacher_id);

        CREATE TABLE IF NOT EXISTS subjects (
          subject_id SERIAL PRIMARY KEY,
          class_id INT NOT NULL,
          subject_name VARCHAR(100) NOT NULL,
          subject_code VARCHAR(50),
          teacher_id INT,
          total_marks INT DEFAULT 100,
          passing_marks INT DEFAULT 40,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE,
            FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS subjects CASCADE;
      DROP TABLE IF EXISTS students CASCADE;
      DROP TABLE IF EXISTS classes CASCADE;
    `);
  },
};
