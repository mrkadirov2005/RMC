module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_receipt_number_key;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_receipt_number_active
        ON payments(receipt_number)
        WHERE receipt_number IS NOT NULL AND deleted_at IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ux_payments_receipt_number_active;
    `);
  },
};
