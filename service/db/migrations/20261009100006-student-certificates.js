module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Certificates of graduates (IELTS, CEFR...), kept as PDF files in the database so they are
      -- part of the regular backups; the city administration asks for them months later.
      CREATE TABLE IF NOT EXISTS student_certificates (
        certificate_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        file_data BYTEA NOT NULL,
        uploaded_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_student_certificates_student ON student_certificates (student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS student_certificates;');
  },
};
