module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- "Doimiy nazorat": students the director follows personally, with whom to keep informed.
      CREATE TABLE IF NOT EXISTS student_watchlist (
        watch_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
        contact_name VARCHAR(255) NOT NULL,
        contact_phone VARCHAR(50),
        note TEXT,
        added_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        removed_at TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_student_watchlist_active
        ON student_watchlist (student_id) WHERE removed_at IS NULL;
      CREATE INDEX IF NOT EXISTS idx_student_watchlist_center ON student_watchlist (center_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS student_watchlist;');
  },
};
