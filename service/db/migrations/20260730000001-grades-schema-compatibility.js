module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        ADD COLUMN IF NOT EXISTS subject_id INT,
        ADD COLUMN IF NOT EXISTS score DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS grade_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS notes TEXT;

      CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON grades(subject_id);
      CREATE INDEX IF NOT EXISTS idx_grades_session_id ON grades(session_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_grades_subject_id;

      ALTER TABLE grades
        DROP COLUMN IF EXISTS notes,
        DROP COLUMN IF EXISTS grade_type,
        DROP COLUMN IF EXISTS score,
        DROP COLUMN IF EXISTS subject_id;
    `);
  },
};
