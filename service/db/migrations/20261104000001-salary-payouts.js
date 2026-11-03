'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Money given against a month's salary is an advance (before it is due) or a salary payout;
      -- a salary can be paid out in parts, each one its own kassa expense.
      ALTER TABLE teacher_salary_advances ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'advance';
      -- A salary record kept in step with its payouts (amount = everything given), not typed in by hand.
      ALTER TABLE teacher_salaries ADD COLUMN IF NOT EXISTS from_payouts BOOLEAN NOT NULL DEFAULT false;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teacher_salary_advances DROP COLUMN IF EXISTS kind;
      ALTER TABLE teacher_salaries DROP COLUMN IF EXISTS from_payouts;
    `);
  },
};
