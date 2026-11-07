// A group's price history belongs to the group: a group deleted for good takes its history with
// it (and history rows can't point at a group that doesn't exist).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM class_price_history h WHERE NOT EXISTS (SELECT 1 FROM classes c WHERE c.class_id = h.class_id);
      ALTER TABLE class_price_history DROP CONSTRAINT IF EXISTS fk_class_price_history_class;
      ALTER TABLE class_price_history
        ADD CONSTRAINT fk_class_price_history_class FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE class_price_history DROP CONSTRAINT IF EXISTS fk_class_price_history_class;');
  },
};
