module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS teacher_salaries (
          salary_id SERIAL PRIMARY KEY,
          center_id INT,
          teacher_id INT NOT NULL,
          salary_year INT NOT NULL,
          salary_month INT NOT NULL,
          amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          is_paid BOOLEAN NOT NULL DEFAULT false,
          paid_at TIMESTAMP,
          marked_by_id INT,
          marked_by_user_type VARCHAR(20),
          marked_by_role VARCHAR(50),
          marked_by_name VARCHAR(200),
          payment_method VARCHAR(50),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
          CONSTRAINT chk_teacher_salaries_month CHECK (salary_month BETWEEN 1 AND 12),
          CONSTRAINT uq_teacher_salaries_teacher_period UNIQUE (teacher_id, salary_year, salary_month)
      );

        CREATE INDEX IF NOT EXISTS idx_teacher_salaries_teacher_id ON teacher_salaries(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_salaries_center_id ON teacher_salaries(center_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_salaries_period ON teacher_salaries(salary_year, salary_month);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS teacher_salaries CASCADE;
    `);
  },
};
