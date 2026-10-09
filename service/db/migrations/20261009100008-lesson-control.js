module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Days with no lessons (holidays): for the whole branch, or for one group. No scores are
      -- expected on them and nobody loses KPI points.
      CREATE TABLE IF NOT EXISTS lesson_days_off (
        day_off_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        off_date DATE NOT NULL,
        class_id INTEGER REFERENCES classes(class_id) ON DELETE CASCADE,
        note TEXT,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ux_lesson_days_off ON lesson_days_off (center_id, off_date, COALESCE(class_id, 0));

      -- A teacher asks to move one lesson (e.g. Wednesday to Sunday); once an admin approves,
      -- scores are expected on the new date instead.
      CREATE TABLE IF NOT EXISTS lesson_reschedules (
        reschedule_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
        teacher_id INTEGER NOT NULL,
        original_date DATE NOT NULL,
        new_date DATE NOT NULL,
        new_time TIME,
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        decided_by_name VARCHAR(255),
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_lesson_reschedules_center_status ON lesson_reschedules (center_id, status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS lesson_reschedules;
      DROP TABLE IF EXISTS lesson_days_off;
    `);
  },
};
