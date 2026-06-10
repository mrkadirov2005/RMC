module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE teachers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

      CREATE INDEX IF NOT EXISTS idx_students_deleted_at ON students(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_teachers_deleted_at ON teachers(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_classes_deleted_at ON classes(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

      ALTER TABLE students DROP CONSTRAINT IF EXISTS students_enrollment_number_key;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS students_username_key;
      ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_employee_id_key;
      ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_email_key;
      ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_username_key;
      ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_class_code_key;
      ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_receipt_number_key;
      DROP INDEX IF EXISTS ux_sessions_class_date_time;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_students_enrollment_number_active
        ON students(enrollment_number)
        WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_students_username_active
        ON students(username)
        WHERE username IS NOT NULL AND deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_teachers_employee_id_active
        ON teachers(employee_id)
        WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_teachers_email_active
        ON teachers(email)
        WHERE email IS NOT NULL AND deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_teachers_username_active
        ON teachers(username)
        WHERE username IS NOT NULL AND deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_classes_class_code_active
        ON classes(class_code)
        WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_payments_receipt_number_active
        ON payments(receipt_number)
        WHERE receipt_number IS NOT NULL AND deleted_at IS NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_class_date_time_active
        ON sessions(class_id, session_date, start_time)
        WHERE deleted_at IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS ux_sessions_class_date_time_active;
      DROP INDEX IF EXISTS ux_payments_receipt_number_active;
      DROP INDEX IF EXISTS ux_classes_class_code_active;
      DROP INDEX IF EXISTS ux_teachers_username_active;
      DROP INDEX IF EXISTS ux_teachers_email_active;
      DROP INDEX IF EXISTS ux_teachers_employee_id_active;
      DROP INDEX IF EXISTS ux_students_username_active;
      DROP INDEX IF EXISTS ux_students_enrollment_number_active;

      CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_class_date_time
        ON sessions (class_id, session_date, start_time);

      DROP INDEX IF EXISTS idx_sessions_deleted_at;
      DROP INDEX IF EXISTS idx_payments_deleted_at;
      DROP INDEX IF EXISTS idx_classes_deleted_at;
      DROP INDEX IF EXISTS idx_teachers_deleted_at;
      DROP INDEX IF EXISTS idx_students_deleted_at;

      ALTER TABLE sessions DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE payments DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE classes DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE teachers DROP COLUMN IF EXISTS deleted_at;
      ALTER TABLE students DROP COLUMN IF EXISTS deleted_at;
    `);
  },
};
