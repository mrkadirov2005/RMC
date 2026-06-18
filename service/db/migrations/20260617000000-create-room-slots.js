module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS room_slots (
        slot_id SERIAL PRIMARY KEY,
        center_id INT NOT NULL,
        room_id INT NOT NULL,
        slot_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        duration_minutes INT DEFAULT 30,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
        UNIQUE(room_id, slot_date, start_time)
      );

      CREATE INDEX IF NOT EXISTS idx_room_slots_center_id ON room_slots(center_id);
      CREATE INDEX IF NOT EXISTS idx_room_slots_room_id ON room_slots(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_slots_date ON room_slots(slot_date);
      CREATE INDEX IF NOT EXISTS idx_room_slots_available ON room_slots(is_available);
      CREATE INDEX IF NOT EXISTS idx_room_slots_room_date ON room_slots(room_id, slot_date);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS room_slots CASCADE;
    `);
  },
};
