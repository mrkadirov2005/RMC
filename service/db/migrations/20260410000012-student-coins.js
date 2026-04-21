module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE students ADD COLUMN IF NOT EXISTS coins INT DEFAULT 0;
      UPDATE students SET coins = 0 WHERE coins IS NULL;
      ALTER TABLE students ALTER COLUMN coins SET NOT NULL;

      CREATE TABLE IF NOT EXISTS student_coin_transactions (
          transaction_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          delta INT NOT NULL,
          reason TEXT,
          created_by INT,
          created_by_type VARCHAR(20),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_student_coin_transactions_student_id ON student_coin_transactions(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_coin_transactions_center_id ON student_coin_transactions(center_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS student_coin_transactions CASCADE;
      ALTER TABLE students DROP COLUMN IF EXISTS coins;
    `);
  },
};
