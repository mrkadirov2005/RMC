'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The optional extra name shown in brackets after the room's number, e.g. "5 (Katta zal)".
      ALTER TABLE physical_rooms ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE physical_rooms DROP COLUMN IF EXISTS nickname;');
  },
};
