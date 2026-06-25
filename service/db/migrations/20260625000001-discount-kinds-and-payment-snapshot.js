module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_kind') THEN
          CREATE TYPE discount_kind AS ENUM ('serial_discount', 'monthly_discount');
        END IF;
      END $$;

      ALTER TABLE discounts
        ADD COLUMN IF NOT EXISTS discount_kind discount_kind NOT NULL DEFAULT 'serial_discount',
        ADD COLUMN IF NOT EXISTS original_price DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS final_price DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS payment_period VARCHAR(7);

      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS discount_id INT,
        ADD COLUMN IF NOT EXISTS discount_kind VARCHAR(40),
        ADD COLUMN IF NOT EXISTS discount_value_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS discount_value DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS final_amount DECIMAL(12,2),
        ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;

      UPDATE payments
      SET
        original_amount = COALESCE(original_amount, amount),
        final_amount = COALESCE(final_amount, amount),
        discount_amount = COALESCE(discount_amount, 0),
        is_complete = COALESCE(is_complete, TRUE);

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'payments_discount_fk'
        ) THEN
          ALTER TABLE payments
            ADD CONSTRAINT payments_discount_fk
            FOREIGN KEY (discount_id) REFERENCES discounts(discount_id);
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_discounts_center_kind ON discounts(center_id, discount_kind);
      CREATE INDEX IF NOT EXISTS idx_discounts_period ON discounts(payment_period);
      CREATE INDEX IF NOT EXISTS idx_payments_discount_id ON payments(discount_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_payments_discount_id;
      DROP INDEX IF EXISTS idx_discounts_period;
      DROP INDEX IF EXISTS idx_discounts_center_kind;

      ALTER TABLE payments
        DROP CONSTRAINT IF EXISTS payments_discount_fk,
        DROP COLUMN IF EXISTS is_complete,
        DROP COLUMN IF EXISTS final_amount,
        DROP COLUMN IF EXISTS discount_amount,
        DROP COLUMN IF EXISTS original_amount,
        DROP COLUMN IF EXISTS discount_value,
        DROP COLUMN IF EXISTS discount_value_type,
        DROP COLUMN IF EXISTS discount_kind,
        DROP COLUMN IF EXISTS discount_id;

      ALTER TABLE discounts
        DROP COLUMN IF EXISTS payment_period,
        DROP COLUMN IF EXISTS final_price,
        DROP COLUMN IF EXISTS original_price,
        DROP COLUMN IF EXISTS discount_kind;

      DROP TYPE IF EXISTS discount_kind;
    `);
  },
};
