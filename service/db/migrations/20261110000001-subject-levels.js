// Subject -> level -> group. A level belongs to a subject and carries the price; its groups take
// that price. Level prices change from a month (level_price_history), and a group's place in a
// level is kept by month too (class_level_history), so months before a raise or before a group
// joined a level keep the price they had.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS subject_levels (
        level_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        subject_id INTEGER NOT NULL REFERENCES subjects(subject_id) ON DELETE RESTRICT,
        level_name VARCHAR(100) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        -- This month's price, kept in step with level_price_history.
        payment_amount NUMERIC(14, 2),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_subject_levels_subject ON subject_levels (subject_id);
      CREATE INDEX IF NOT EXISTS idx_subject_levels_center ON subject_levels (center_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_subject_levels_name
        ON subject_levels (subject_id, lower(level_name)) WHERE deleted_at IS NULL;

      CREATE TABLE IF NOT EXISTS level_price_history (
        history_id SERIAL PRIMARY KEY,
        level_id INTEGER NOT NULL REFERENCES subject_levels(level_id) ON DELETE CASCADE,
        center_id INTEGER,
        amount NUMERIC(14, 2) NOT NULL,
        previous_amount NUMERIC(14, 2),
        effective_from DATE NOT NULL,
        note TEXT,
        source VARCHAR(20) NOT NULL DEFAULT 'manual',
        changed_by_type VARCHAR(20),
        changed_by_id INTEGER,
        changed_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_level_price_history_level ON level_price_history (level_id, effective_from);

      CREATE TABLE IF NOT EXISTS class_level_history (
        history_id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
        -- NULL: the group left its level and uses its own price from this month.
        level_id INTEGER REFERENCES subject_levels(level_id) ON DELETE RESTRICT,
        center_id INTEGER,
        effective_from DATE NOT NULL,
        changed_by_type VARCHAR(20),
        changed_by_id INTEGER,
        changed_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_class_level_history_class ON class_level_history (class_id, effective_from);
      CREATE INDEX IF NOT EXISTS idx_class_level_history_level ON class_level_history (level_id);

      -- The group's level this month, kept in step with class_level_history.
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS level_id INTEGER REFERENCES subject_levels(level_id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS idx_classes_level_id ON classes (level_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE classes DROP COLUMN IF EXISTS level_id;
      DROP TABLE IF EXISTS class_level_history;
      DROP TABLE IF EXISTS level_price_history;
      DROP TABLE IF EXISTS subject_levels;
    `);
  },
};
