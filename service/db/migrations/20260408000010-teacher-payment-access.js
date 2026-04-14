module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS teacher_payment_credentials (
          teacher_id INT PRIMARY KEY,
          password_hash VARCHAR(255) NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INT,
          updated_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_used_at TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_teacher_payment_active ON teacher_payment_credentials(is_active);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS teacher_payment_credentials CASCADE;
    `);
  },
};
