module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-055 Files uploaded from the app (audio answers, photos, PDFs). The bytes live in private
      -- storage (S3, or a local folder in development); this row says whose file it is, what it is
      -- and whether the upload finished. Files are only ever served through short-lived signed URLs.
      CREATE TABLE IF NOT EXISTS media_files (
        media_id SERIAL PRIMARY KEY,
        owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('student', 'parent')),
        owner_id INTEGER NOT NULL,
        purpose VARCHAR(30) NOT NULL,
        kind VARCHAR(10) NOT NULL CHECK (kind IN ('audio', 'image', 'pdf')),
        content_type VARCHAR(100) NOT NULL,
        size_bytes INTEGER NOT NULL,
        file_name VARCHAR(200),
        storage_key VARCHAR(300) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'rejected')),
        -- Set when a homework submission uses the file, so the group's teacher may open it.
        assignment_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        uploaded_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_media_files_owner ON media_files (owner_type, owner_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_media_files_assignment ON media_files (assignment_id) WHERE assignment_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS media_files;');
  },
};
