module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE grades
        ADD COLUMN IF NOT EXISTS base_coin INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_daily_coin INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS coin_comment TEXT;

      ALTER TABLE student_coin_transactions
        ADD COLUMN IF NOT EXISTS source_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS source_id INT;

      CREATE UNIQUE INDEX IF NOT EXISTS uniq_student_coin_source
        ON student_coin_transactions (student_id, source_type, source_id)
        WHERE source_type IS NOT NULL AND source_id IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS uniq_student_coin_source;

      ALTER TABLE student_coin_transactions
        DROP COLUMN IF EXISTS source_id,
        DROP COLUMN IF EXISTS source_type;

      ALTER TABLE grades
        DROP COLUMN IF EXISTS coin_comment,
        DROP COLUMN IF EXISTS total_daily_coin,
        DROP COLUMN IF EXISTS base_coin;
    `);
  },
};
