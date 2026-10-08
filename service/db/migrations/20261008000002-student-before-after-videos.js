module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Links to a child's "before" video (recorded when they start) and "after" video (after
      -- 5-6 months), shown to parents. Kept on the child's main record; Loom, Google Drive or
      -- YouTube links.
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS before_video_url TEXT,
        ADD COLUMN IF NOT EXISTS after_video_url TEXT;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students DROP COLUMN IF EXISTS before_video_url, DROP COLUMN IF EXISTS after_video_url;
    `);
  },
};
