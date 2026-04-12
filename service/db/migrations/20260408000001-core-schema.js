module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TYPE assignment_status AS ENUM ('Pending', 'Submitted', 'Graded');
      CREATE TYPE class_status AS ENUM ('Active', 'Dropped', 'Graduated');
      CREATE TYPE payment_frequency AS ENUM ('Monthly', 'Quarterly', 'Annual');
      CREATE TYPE student_status AS ENUM ('Active', 'Inactive', 'Graduated', 'Removed');
      CREATE TYPE student_gender AS ENUM ('Male', 'Female', 'Other');
      CREATE TYPE superuser_status AS ENUM ('Active', 'Inactive', 'Suspended');
      CREATE TYPE teacher_status AS ENUM ('Active', 'Inactive', 'Retired');
      CREATE TYPE teacher_gender AS ENUM ('Male', 'Female', 'Other');
      CREATE TYPE attendance_status AS ENUM ('Present', 'Absent', 'Late', 'Half Day');
      CREATE TYPE payment_method_t AS ENUM ('Cash', 'Credit Card', 'Bank Transfer', 'Check', 'Digital Wallet');

      CREATE TABLE edu_centers (
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

      CREATE INDEX idx_center_code ON edu_centers(center_code);
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
