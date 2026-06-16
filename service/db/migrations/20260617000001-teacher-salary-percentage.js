module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teachers
        ADD COLUMN IF NOT EXISTS salary_percentage DECIMAL(5,2) NOT NULL DEFAULT 50;

      ALTER TABLE teachers
        DROP CONSTRAINT IF EXISTS chk_teachers_salary_percentage;

      ALTER TABLE teachers
        ADD CONSTRAINT chk_teachers_salary_percentage
        CHECK (salary_percentage >= 0 AND salary_percentage <= 100);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teachers DROP CONSTRAINT IF EXISTS chk_teachers_salary_percentage;
      ALTER TABLE teachers DROP COLUMN IF EXISTS salary_percentage;
    `);
  },
};
