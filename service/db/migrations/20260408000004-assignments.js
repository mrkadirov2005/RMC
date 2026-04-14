module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS assignments (
          assignment_id SERIAL PRIMARY KEY,
          class_id INT NOT NULL,
          assignment_title VARCHAR(255) NOT NULL,
          description TEXT,
          due_date DATE,
          submission_date DATE,
          grade DECIMAL(5,2),
          status assignment_status DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE
      );

        CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

        CREATE TABLE IF NOT EXISTS assignment_submissions (
          submission_id SERIAL PRIMARY KEY,
          assignment_id INT NOT NULL,
          student_id INT NOT NULL,
          submission_date TIMESTAMP NOT NULL,
          file_path VARCHAR(500),
          grade DECIMAL(6,2),
          feedback TEXT,
          status VARCHAR(50) DEFAULT 'Submitted',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(assignment_id, student_id),
          FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(student_id)
      );

      CREATE INDEX IF NOT EXISTS idx_assignment_submission_assignment ON assignment_submissions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_submission_student ON assignment_submissions(student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS assignment_submissions CASCADE;
      DROP TABLE IF EXISTS assignments CASCADE;
    `);
  },
};
