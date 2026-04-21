module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        room_id SERIAL PRIMARY KEY,
        center_id INT NOT NULL,
        room_number VARCHAR(50) NOT NULL,
        class_id INT,
        day VARCHAR(20),
        time TIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (center_id) REFERENCES edu_centers(center_id),
        FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_rooms_center_id ON rooms(center_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
      CREATE INDEX IF NOT EXISTS idx_rooms_class_id ON rooms(class_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS rooms CASCADE;
    `);
  },
};
