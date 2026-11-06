// A group's price over time. A month is billed at the price in effect for it, so raising a
// group's price no longer turns months already paid at the old price into debts. Prices change
// from the group's payments section ("Change group payment"); the first change also saves the
// price before it, for all earlier months.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS class_price_history (
        history_id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL,
        center_id INTEGER,
        amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
        previous_amount NUMERIC(14, 2),
        -- First day of the first month billed at this price.
        effective_from DATE NOT NULL,
        note TEXT,
        source VARCHAR(10) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'initial')),
        changed_by_type VARCHAR(20),
        changed_by_id INTEGER,
        changed_by_name VARCHAR(150),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_class_price_history_class
        ON class_price_history (class_id, effective_from DESC, history_id DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS class_price_history;');
  },
};
