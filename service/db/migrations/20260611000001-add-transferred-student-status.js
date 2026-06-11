module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'student_status'
            AND e.enumlabel = 'Transferred'
        ) THEN
          ALTER TYPE student_status ADD VALUE 'Transferred';
        END IF;
      END $$;
    `);
  },

  async down() {
    // PostgreSQL enum values cannot be safely removed without rebuilding dependent columns.
  },
};
