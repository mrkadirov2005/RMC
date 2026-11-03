'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The kassa expense a paid salary created (what was paid out after the advances), so editing or
      -- un-marking the salary keeps the kassa right.
      ALTER TABLE teacher_salaries ADD COLUMN IF NOT EXISTS expense_id INT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE teacher_salaries DROP COLUMN IF EXISTS expense_id;');
  },
};
