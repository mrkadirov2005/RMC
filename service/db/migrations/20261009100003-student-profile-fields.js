module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- The client's full student profile. school_name / school_class keep the current place of
      -- study and its class or course; study_place_type says whether it is a school, college or
      -- university. passport_number is shown to admins and the owner only.
      ALTER TABLE students
        ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS passport_number VARCHAR(20),
        ADD COLUMN IF NOT EXISTS study_place_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS previous_school VARCHAR(255);

      -- "How they found us": the client's list. teacher_referral (linked to a referring teacher)
      -- stays and is renamed; the seeded English channels are switched off, not deleted, so
      -- students already linked to them keep their history. Sources admins added stay as they are.
      INSERT INTO student_acquisition_sources (source_code, source_name) VALUES
        ('telegram', 'Telegram'),
        ('instagram', 'Instagram'),
        ('friend', 'Do''stim aytdi'),
        ('relative', 'Qarindoshim'),
        ('banner', 'Banner')
      ON CONFLICT (source_code) DO UPDATE SET active = TRUE;
      UPDATE student_acquisition_sources SET source_name = 'Ustozni maqtashgani uchun (shu ustozga o''qimoqchi)', active = TRUE
        WHERE source_code = 'teacher_referral';
      UPDATE student_acquisition_sources SET source_name = 'Boshqa', active = TRUE WHERE source_code = 'other';
      UPDATE student_acquisition_sources SET active = FALSE
        WHERE source_code IN ('advertisement', 'student_referral', 'social_media', 'walk_in');
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE student_acquisition_sources SET active = TRUE
        WHERE source_code IN ('advertisement', 'student_referral', 'social_media', 'walk_in');
      UPDATE student_acquisition_sources SET source_name = 'Teacher referral' WHERE source_code = 'teacher_referral';
      UPDATE student_acquisition_sources SET source_name = 'Other' WHERE source_code = 'other';
      UPDATE student_acquisition_sources SET active = FALSE
        WHERE source_code IN ('telegram', 'instagram', 'friend', 'relative', 'banner');
      ALTER TABLE students
        DROP COLUMN IF EXISTS previous_school,
        DROP COLUMN IF EXISTS study_place_type,
        DROP COLUMN IF EXISTS passport_number,
        DROP COLUMN IF EXISTS father_name;
    `);
  },
};
