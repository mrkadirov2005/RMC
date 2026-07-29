module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE debts
        ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Open',
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

      UPDATE debts
      SET status = CASE
        WHEN COALESCE(balance, debt_amount - COALESCE(amount_paid, 0), 0) <= 0 THEN 'Paid'
        ELSE 'Open'
      END
      WHERE status IS NULL;

      CREATE INDEX IF NOT EXISTS idx_debts_center_id ON debts(center_id);
      CREATE INDEX IF NOT EXISTS idx_debts_student_id ON debts(student_id);
      CREATE INDEX IF NOT EXISTS idx_debts_deleted_at ON debts(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_debts_status;
      DROP INDEX IF EXISTS idx_debts_deleted_at;
      DROP INDEX IF EXISTS idx_debts_student_id;
      DROP INDEX IF EXISTS idx_debts_center_id;

      ALTER TABLE debts
        DROP COLUMN IF EXISTS deleted_at,
        DROP COLUMN IF EXISTS status,
        DROP COLUMN IF EXISTS paid_amount,
        DROP COLUMN IF EXISTS amount;
    `);
  },
};
