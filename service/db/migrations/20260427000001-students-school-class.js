module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS school_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS school_class VARCHAR(100);

      CREATE INDEX IF NOT EXISTS idx_students_school_name ON students(school_name);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_students_school_name;

      ALTER TABLE students
        DROP COLUMN IF EXISTS school_name,
        DROP COLUMN IF EXISTS school_class;
    `);
  },
};

