module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-172 @MOB-175 The app is installed from the website (an APK on Google Drive), not from the
      -- stores. Each row is a published version; the newest one is what the download link and the
      -- app's update check use. Older versions below min_version must update before signing in.
      CREATE TABLE IF NOT EXISTS mobile_app_releases (
        release_id SERIAL PRIMARY KEY,
        platform VARCHAR(10) NOT NULL DEFAULT 'android' CHECK (platform IN ('android')),
        version VARCHAR(20) NOT NULL,
        min_version VARCHAR(20) NOT NULL,
        download_url TEXT NOT NULL,
        notes TEXT,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_app_releases_latest ON mobile_app_releases (platform, release_id DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS mobile_app_releases;');
  },
};
