module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE assignment_status AS ENUM ('Pending', 'Submitted', 'Graded');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE class_status AS ENUM ('Active', 'Dropped', 'Graduated');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE payment_frequency AS ENUM ('Monthly', 'Quarterly', 'Annual');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Graduated', 'Removed');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE student_gender AS ENUM ('Male', 'Female', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE superuser_status AS ENUM ('Active', 'Inactive', 'Suspended');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE teacher_status AS ENUM ('Active', 'Inactive', 'Retired');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE teacher_gender AS ENUM ('Male', 'Female', 'Other');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Half Day');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        CREATE TYPE payment_method_t AS ENUM ('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Digital Wallet');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

        CREATE TABLE IF NOT EXISTS edu_centers (
          center_id SERIAL PRIMARY KEY,
          center_name VARCHAR(255) NOT NULL,
          center_code VARCHAR(50) NOT NULL UNIQUE,
          email VARCHAR(100),
          phone VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          principal_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

        CREATE INDEX IF NOT EXISTS idx_center_code ON edu_centers(center_code);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS edu_centers CASCADE;
      DROP TYPE IF EXISTS payment_method_t CASCADE;
      DROP TYPE IF EXISTS attendance_status CASCADE;
      DROP TYPE IF EXISTS teacher_gender CASCADE;
      DROP TYPE IF EXISTS teacher_status CASCADE;
      DROP TYPE IF EXISTS superuser_status CASCADE;
      DROP TYPE IF EXISTS student_gender CASCADE;
      DROP TYPE IF EXISTS student_status CASCADE;
      DROP TYPE IF EXISTS payment_frequency CASCADE;
      DROP TYPE IF EXISTS class_status CASCADE;
      DROP TYPE IF EXISTS assignment_status CASCADE;
    `);
  },
};
