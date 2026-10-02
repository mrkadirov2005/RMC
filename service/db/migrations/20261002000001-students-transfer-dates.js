module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- start_date/end_date bound a record's time in its group. Only transfers set them, so
      -- every existing record keeps NULLs and is billed and listed exactly as before.
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS start_date DATE,
        ADD COLUMN IF NOT EXISTS end_date DATE,
        ADD COLUMN IF NOT EXISTS transferred_from_student_id INTEGER;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_students_transferred_from_student_id'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT fk_students_transferred_from_student_id
            FOREIGN KEY (transferred_from_student_id)
            REFERENCES students(student_id)
            ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_students_transferred_from_student_id
        ON students(transferred_from_student_id);

      -- Past transfers already recorded which record they came from on their adjustment rows.
      -- Linking them changes no amounts or listings; it only makes the history explicit.
      UPDATE students s
      SET transferred_from_student_id = p.transfer_source_student_id
      FROM (
        SELECT DISTINCT ON (transfer_target_student_id) transfer_target_student_id, transfer_source_student_id
        FROM payments
        WHERE transfer_target_student_id IS NOT NULL AND transfer_source_student_id IS NOT NULL
        ORDER BY transfer_target_student_id, payment_id DESC
      ) p
      WHERE s.student_id = p.transfer_target_student_id
        AND s.student_id <> p.transfer_source_student_id
        AND s.transferred_from_student_id IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_students_transferred_from_student_id;

      ALTER TABLE students
        DROP CONSTRAINT IF EXISTS fk_students_transferred_from_student_id,
        DROP COLUMN IF EXISTS transferred_from_student_id,
        DROP COLUMN IF EXISTS end_date,
        DROP COLUMN IF EXISTS start_date;
    `);
  },
};
