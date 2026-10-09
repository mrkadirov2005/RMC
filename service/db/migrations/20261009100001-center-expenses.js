module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Money an admin spent from the center's till (cleaning supplies, repairs...). The daily cash
      -- report subtracts them from the day's payments, per payment method.
      CREATE TABLE IF NOT EXISTS expenses (
        expense_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        expense_date DATE NOT NULL,
        amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
        payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
        description TEXT NOT NULL,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_expenses_center_date ON expenses (center_id, expense_date);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS expenses;');
  },
};
