module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS telegram_student_registrations (
        registration_id SERIAL PRIMARY KEY,
        telegram_user_id BIGINT NOT NULL,
        telegram_chat_id BIGINT NOT NULL,
        telegram_username VARCHAR(100),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(30),
        date_of_birth DATE,
        parent_name VARCHAR(200),
        parent_phone VARCHAR(30),
        gender VARCHAR(20),
        username VARCHAR(100),
        password_hash VARCHAR(255),
        school_name VARCHAR(200),
        school_class VARCHAR(50),
        center_id INT,
        class_label VARCHAR(100) NOT NULL DEFAULT 'Unassigned',
        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
        converted_student_id INT,
        converted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE telegram_student_registrations
        ADD COLUMN IF NOT EXISTS converted_student_id INT,
        ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'telegram_student_registrations_center_fk'
        ) THEN
          ALTER TABLE telegram_student_registrations
            ADD CONSTRAINT telegram_student_registrations_center_fk
            FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'telegram_student_registrations_student_fk'
        ) THEN
          ALTER TABLE telegram_student_registrations
            ADD CONSTRAINT telegram_student_registrations_student_fk
            FOREIGN KEY (converted_student_id) REFERENCES students(student_id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_telegram_student_registrations_chat
        ON telegram_student_registrations(telegram_chat_id);
      CREATE INDEX IF NOT EXISTS idx_telegram_student_registrations_status
        ON telegram_student_registrations(status);
      CREATE INDEX IF NOT EXISTS idx_telegram_student_registrations_center
        ON telegram_student_registrations(center_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS telegram_student_registrations CASCADE;
    `);
  },
};
