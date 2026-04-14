module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS teachers (
          teacher_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL,
          employee_id VARCHAR(50) NOT NULL UNIQUE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE,
          phone VARCHAR(20),
          date_of_birth DATE,
          gender teacher_gender,
          qualification VARCHAR(255),
          specialization VARCHAR(100),
          status teacher_status DEFAULT 'Active',
          roles JSONB,
          username VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

        CREATE INDEX IF NOT EXISTS idx_employee_id ON teachers(employee_id);
        CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

        CREATE TABLE IF NOT EXISTS superusers (
          superuser_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(100) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(100) DEFAULT 'Admin',
          permissions JSONB,
          status superuser_status DEFAULT 'Active',
          last_login TIMESTAMP,
          login_attempts INT DEFAULT 0,
          is_locked BOOLEAN DEFAULT FALSE,
          locked_until TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

      CREATE INDEX IF NOT EXISTS idx_superuser_username ON superusers(username);
      CREATE INDEX IF NOT EXISTS idx_superuser_status ON superusers(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS superusers CASCADE;
      DROP TABLE IF EXISTS teachers CASCADE;
    `);
  },
};
