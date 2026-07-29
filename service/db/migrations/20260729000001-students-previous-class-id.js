module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS previous_class_id INTEGER;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_students_previous_class_id'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT fk_students_previous_class_id
            FOREIGN KEY (previous_class_id)
            REFERENCES classes(class_id)
            ON DELETE SET NULL;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_students_previous_class_id
        ON students(previous_class_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_students_previous_class_id;

      ALTER TABLE students
        DROP CONSTRAINT IF EXISTS fk_students_previous_class_id,
        DROP COLUMN IF EXISTS previous_class_id;
    `);
  },
};
