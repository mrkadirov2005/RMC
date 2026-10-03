module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- One child in several groups keeps one record per group. Extra group records point at
      -- the record that holds the login (main_student_id); NULL marks that main record. Every
      -- existing record starts as its own main, so nothing changes until a group is linked.
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS main_student_id INTEGER;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'fk_students_main_student_id'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT fk_students_main_student_id
            FOREIGN KEY (main_student_id)
            REFERENCES students(student_id)
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'ck_students_main_student_id_not_self'
        ) THEN
          ALTER TABLE students
            ADD CONSTRAINT ck_students_main_student_id_not_self
            CHECK (main_student_id IS NULL OR main_student_id <> student_id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_students_main_student_id
        ON students(main_student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_students_main_student_id;

      ALTER TABLE students
        DROP CONSTRAINT IF EXISTS ck_students_main_student_id_not_self,
        DROP CONSTRAINT IF EXISTS fk_students_main_student_id,
        DROP COLUMN IF EXISTS main_student_id;
    `);
  },
};
