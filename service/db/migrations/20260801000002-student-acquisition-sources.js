module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS student_acquisition_sources (
        source_id SERIAL PRIMARY KEY,
        source_code VARCHAR(50) NOT NULL UNIQUE,
        source_name VARCHAR(100) NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO student_acquisition_sources (source_code, source_name) VALUES
        ('advertisement', 'Advertisement'),
        ('teacher_referral', 'Teacher referral'),
        ('student_referral', 'Student or parent referral'),
        ('social_media', 'Social media'),
        ('walk_in', 'Walk-in'),
        ('other', 'Other')
      ON CONFLICT (source_code) DO NOTHING;

      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS acquisition_source_id INTEGER,
        ADD COLUMN IF NOT EXISTS acquisition_detail TEXT,
        ADD COLUMN IF NOT EXISTS referred_by_teacher_id INTEGER;

      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_acquisition_source;
      ALTER TABLE students ADD CONSTRAINT fk_students_acquisition_source
        FOREIGN KEY (acquisition_source_id) REFERENCES student_acquisition_sources(source_id) ON DELETE SET NULL;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_referred_teacher;
      ALTER TABLE students ADD CONSTRAINT fk_students_referred_teacher
        FOREIGN KEY (referred_by_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_acquisition_source;
      ALTER TABLE students DROP CONSTRAINT IF EXISTS fk_students_referred_teacher;
      ALTER TABLE students DROP COLUMN IF EXISTS acquisition_source_id;
      ALTER TABLE students DROP COLUMN IF EXISTS acquisition_detail;
      ALTER TABLE students DROP COLUMN IF EXISTS referred_by_teacher_id;
      DROP TABLE IF EXISTS student_acquisition_sources;
    `);
  },
};
