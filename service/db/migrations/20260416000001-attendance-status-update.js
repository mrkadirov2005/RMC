module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'Absent NR';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'Absent R';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  },

  async down() {
    // Removing enum values in Postgres requires creating a new type.
  },
};
