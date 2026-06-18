module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS room_bookings (
        booking_id SERIAL PRIMARY KEY,
        center_id INT NOT NULL,
        slot_id INT NOT NULL,
        class_id INT NOT NULL,
        session_id INT,
        teacher_id INT,
        booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        booking_status VARCHAR(50) DEFAULT 'Confirmed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
        FOREIGN KEY (slot_id) REFERENCES room_slots(slot_id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(class_id),
        FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE SET NULL,
        FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL,
        UNIQUE(slot_id, class_id)
      );

      CREATE INDEX IF NOT EXISTS idx_room_bookings_center_id ON room_bookings(center_id);
      CREATE INDEX IF NOT EXISTS idx_room_bookings_slot_id ON room_bookings(slot_id);
      CREATE INDEX IF NOT EXISTS idx_room_bookings_class_id ON room_bookings(class_id);
      CREATE INDEX IF NOT EXISTS idx_room_bookings_session_id ON room_bookings(session_id);
      CREATE INDEX IF NOT EXISTS idx_room_bookings_teacher_id ON room_bookings(teacher_id);
      CREATE INDEX IF NOT EXISTS idx_room_bookings_status ON room_bookings(booking_status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS room_bookings CASCADE;
    `);
  },
};
