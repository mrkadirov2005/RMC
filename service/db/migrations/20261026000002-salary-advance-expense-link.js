'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The kassa expense an advance created, so removing the advance gives the money back.
      ALTER TABLE teacher_salary_advances ADD COLUMN IF NOT EXISTS expense_id INT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE teacher_salary_advances DROP COLUMN IF EXISTS expense_id;');
  },
};
