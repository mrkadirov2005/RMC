module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-055 Uploaded files are moved to Google Drive; the row keeps the Drive file and its
      -- direct download link. Empty while the file is still on the backend server.
      ALTER TABLE media_files ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(100);
      ALTER TABLE media_files ADD COLUMN IF NOT EXISTS download_url TEXT;
      CREATE INDEX IF NOT EXISTS idx_media_files_not_on_drive ON media_files (media_id)
        WHERE status = 'uploaded' AND drive_file_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_media_files_not_on_drive;
      ALTER TABLE media_files DROP COLUMN IF EXISTS download_url;
      ALTER TABLE media_files DROP COLUMN IF EXISTS drive_file_id;
    `);
  },
};
