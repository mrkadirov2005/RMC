module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS transfer_source_student_id INT,
        ADD COLUMN IF NOT EXISTS transfer_target_student_id INT,
        ADD COLUMN IF NOT EXISTS transfer_source_class_id INT,
        ADD COLUMN IF NOT EXISTS transfer_target_class_id INT,
        ADD COLUMN IF NOT EXISTS transfer_effective_date DATE,
        ADD COLUMN IF NOT EXISTS covered_from DATE,
        ADD COLUMN IF NOT EXISTS covered_to DATE,
        ADD COLUMN IF NOT EXISTS coverage_days INT,
        ADD COLUMN IF NOT EXISTS coverage_total_days INT;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_transfer_source_student_fk'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT payments_transfer_source_student_fk
            FOREIGN KEY (transfer_source_student_id) REFERENCES students(student_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_transfer_target_student_fk'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT payments_transfer_target_student_fk
            FOREIGN KEY (transfer_target_student_id) REFERENCES students(student_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_transfer_source_class_fk'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT payments_transfer_source_class_fk
            FOREIGN KEY (transfer_source_class_id) REFERENCES classes(class_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_transfer_target_class_fk'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT payments_transfer_target_class_fk
            FOREIGN KEY (transfer_target_class_id) REFERENCES classes(class_id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_payments_transfer_students
        ON payments(transfer_source_student_id, transfer_target_student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_payments_transfer_students;

      ALTER TABLE payments
        DROP CONSTRAINT IF EXISTS payments_transfer_target_class_fk,
        DROP CONSTRAINT IF EXISTS payments_transfer_source_class_fk,
        DROP CONSTRAINT IF EXISTS payments_transfer_target_student_fk,
        DROP CONSTRAINT IF EXISTS payments_transfer_source_student_fk,
        DROP COLUMN IF EXISTS coverage_total_days,
        DROP COLUMN IF EXISTS coverage_days,
        DROP COLUMN IF EXISTS covered_to,
        DROP COLUMN IF EXISTS covered_from,
        DROP COLUMN IF EXISTS transfer_effective_date,
        DROP COLUMN IF EXISTS transfer_target_class_id,
        DROP COLUMN IF EXISTS transfer_source_class_id,
        DROP COLUMN IF EXISTS transfer_target_student_id,
        DROP COLUMN IF EXISTS transfer_source_student_id;
    `);
  },
};
