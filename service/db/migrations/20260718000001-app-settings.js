module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_id SERIAL PRIMARY KEY,
        center_id INT,
        setting_key VARCHAR(100) NOT NULL,
        setting_value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
        UNIQUE (center_id, setting_key)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS uniq_app_settings_global_key
        ON app_settings (setting_key)
        WHERE center_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uniq_app_settings_global_key;
      DROP TABLE IF EXISTS app_settings;
    `);
  },
};
