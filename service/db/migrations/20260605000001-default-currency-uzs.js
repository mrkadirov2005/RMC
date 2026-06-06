module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'UZS'");
    await queryInterface.sequelize.query("ALTER TABLE payment_plans ALTER COLUMN currency SET DEFAULT 'UZS'");
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'USD'");
    await queryInterface.sequelize.query("ALTER TABLE payment_plans ALTER COLUMN currency SET DEFAULT 'USD'");
  },
};
