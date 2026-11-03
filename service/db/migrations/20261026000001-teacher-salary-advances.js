'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Money a teacher took before the month's salary was paid out (avans), against that salary month.
      CREATE TABLE IF NOT EXISTS teacher_salary_advances (
        advance_id SERIAL PRIMARY KEY,
        center_id INT,
        teacher_id INT NOT NULL,
        salary_year INT NOT NULL,
        salary_month INT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        given_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        payment_method VARCHAR(50),
        notes TEXT,
        given_by_id INT,
        given_by_role VARCHAR(50),
        given_by_name VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
        CONSTRAINT chk_teacher_salary_advances_month CHECK (salary_month BETWEEN 1 AND 12),
        CONSTRAINT chk_teacher_salary_advances_amount CHECK (amount > 0)
      );
      CREATE INDEX IF NOT EXISTS idx_teacher_salary_advances_teacher_period
        ON teacher_salary_advances(teacher_id, salary_year, salary_month);
      CREATE INDEX IF NOT EXISTS idx_teacher_salary_advances_center_id ON teacher_salary_advances(center_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS teacher_salary_advances CASCADE;');
  },
};
