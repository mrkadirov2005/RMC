module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN DEFAULT FALSE;
      UPDATE students SET is_frozen = FALSE WHERE is_frozen IS NULL;
      ALTER TABLE students ALTER COLUMN is_frozen SET NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_students_is_frozen ON students(is_frozen);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_students_is_frozen;
      ALTER TABLE students DROP COLUMN IF EXISTS is_frozen;
    `);
  },
};
