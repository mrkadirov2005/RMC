module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments
        ADD COLUMN IF NOT EXISTS subject_id INT,
        ADD COLUMN IF NOT EXISTS title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

      UPDATE assignments
      SET title = assignment_title
      WHERE title IS NULL;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_assignments_subject'
        ) THEN
          ALTER TABLE assignments
            ADD CONSTRAINT fk_assignments_subject
            FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON assignments(subject_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_deleted_at ON assignments(deleted_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_assignments_deleted_at;
      DROP INDEX IF EXISTS idx_assignments_subject_id;
      ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_subject;
      ALTER TABLE assignments
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS title,
        DROP COLUMN IF EXISTS subject_id;
    `);
  },
};
