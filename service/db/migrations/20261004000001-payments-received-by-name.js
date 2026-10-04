module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Name of the owner or admin who recorded the payment, printed as the cashier on the
      -- receipt. Stored as text so the receipt still reads correctly if that account is
      -- renamed or removed later. Older payments stay NULL and print without a cashier.
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS received_by_name VARCHAR(255);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments DROP COLUMN IF EXISTS received_by_name;
    `);
  },
};
