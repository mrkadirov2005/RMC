module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS student_id INT;
      ALTER TABLE assignments
        ADD CONSTRAINT fk_assignments_student
        FOREIGN KEY (student_id) REFERENCES students(student_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_student_id ON assignments(student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_student;
      DROP INDEX IF EXISTS idx_assignments_student_id;
      ALTER TABLE assignments DROP COLUMN IF EXISTS student_id;
    `);
  },
};
