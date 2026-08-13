module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS student_action_reasons (
        reason_id SERIAL PRIMARY KEY,
        reason_type VARCHAR(20) NOT NULL,
        reason_code VARCHAR(50) NOT NULL,
        reason_name VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT student_action_reasons_type_code_key UNIQUE (reason_type, reason_code)
      );

      INSERT INTO student_action_reasons (reason_type, reason_code, reason_name) VALUES
        ('transfer', 'teacher_change', 'Teacher change'),
        ('transfer', 'schedule_conflict', 'Schedule conflict'),
        ('transfer', 'level_change', 'Level change'),
        ('transfer', 'student_request', 'Student request'),
        ('transfer', 'other', 'Other'),
        ('delete', 'moved_city', 'Moved city'),
        ('delete', 'financial', 'Financial reasons'),
        ('delete', 'lost_interest', 'Lost interest'),
        ('delete', 'graduated', 'Graduated'),
        ('delete', 'duplicate_record', 'Duplicate record'),
        ('delete', 'other', 'Other')
      ON CONFLICT (reason_type, reason_code) DO NOTHING;

      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS transfer_reason_id INTEGER,
        ADD COLUMN IF NOT EXISTS delete_reason_id INTEGER;

      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_transfer_reason;
      ALTER TABLE students ADD CONSTRAINT fk_students_transfer_reason
        FOREIGN KEY (transfer_reason_id) REFERENCES student_action_reasons(reason_id) ON DELETE SET NULL;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_delete_reason;
      ALTER TABLE students ADD CONSTRAINT fk_students_delete_reason
        FOREIGN KEY (delete_reason_id) REFERENCES student_action_reasons(reason_id) ON DELETE SET NULL;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_transfer_reason;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_delete_reason;
      ALTER TABLE students DROP COLUMN IF EXISTS transfer_reason_id;
      ALTER TABLE students DROP COLUMN IF EXISTS delete_reason_id;
      DROP TABLE IF EXISTS student_action_reasons;
    `);
  },
};
