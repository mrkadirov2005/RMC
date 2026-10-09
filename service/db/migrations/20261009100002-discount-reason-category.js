module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Why a permanent discount was given: poverty (on the poverty register), relative (the family
      -- knows someone; referrer_name says who), charity, or other. reason stays the free-text note.
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS reason_category VARCHAR(40);
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS referrer_name VARCHAR(200);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE discounts DROP COLUMN IF EXISTS referrer_name;
      ALTER TABLE discounts DROP COLUMN IF EXISTS reason_category;
    `);
  },
};
