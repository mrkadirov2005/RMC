module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS teacher_id INT;
      ALTER TABLE assignments
        ADD CONSTRAINT fk_assignments_teacher
        FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_teacher;
      DROP INDEX IF EXISTS idx_assignments_teacher_id;
      ALTER TABLE assignments DROP COLUMN IF EXISTS teacher_id;
    `);
  },
};
