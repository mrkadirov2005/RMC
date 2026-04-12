module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE debts (
          debt_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          debt_amount DECIMAL(12,2) NOT NULL,
          debt_date DATE NOT NULL,
          due_date DATE,
          amount_paid DECIMAL(12,2) DEFAULT 0,
          balance DECIMAL(12,2),
          remarks TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

      CREATE INDEX idx_debt_date ON debts(debt_date);

      CREATE TABLE payments (
          payment_id SERIAL PRIMARY KEY,
          student_id INT NOT NULL,
          center_id INT NOT NULL,
          payment_date DATE NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'USD',
          payment_method payment_method_t DEFAULT 'Cash',
          transaction_reference VARCHAR(100),
          receipt_number VARCHAR(50) UNIQUE,
          payment_status VARCHAR(50) DEFAULT 'Completed',
          payment_type VARCHAR(100),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES students(student_id),
          FOREIGN KEY (center_id) REFERENCES edu_centers(center_id)
      );

      CREATE INDEX idx_payment_date ON payments(payment_date);
      CREATE INDEX idx_payment_status ON payments(payment_status);
      CREATE INDEX idx_payments_student_id ON payments(student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS debts CASCADE;
    `);
  },
};
