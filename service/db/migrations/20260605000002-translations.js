module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS translations (
        id TEXT PRIMARY KEY,
        english TEXT NOT NULL DEFAULT '',
        uzbek TEXT NOT NULL DEFAULT ''
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS translations');
  },
};
