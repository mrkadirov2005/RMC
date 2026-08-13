module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS physical_rooms (
        physical_room_id SERIAL PRIMARY KEY,
        center_id INT NOT NULL REFERENCES edu_centers(center_id),
        name VARCHAR(50) NOT NULL,
        capacity INT,
        location VARCHAR(255),
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        operating_start_time TIME NOT NULL DEFAULT '08:00',
        operating_end_time TIME NOT NULL DEFAULT '21:00',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT physical_rooms_capacity_positive CHECK (capacity IS NULL OR capacity > 0),
        CONSTRAINT physical_rooms_operating_window CHECK (operating_end_time > operating_start_time)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS uq_physical_rooms_center_name
        ON physical_rooms(center_id, lower(trim(name)));
      CREATE INDEX IF NOT EXISTS idx_physical_rooms_center_status
        ON physical_rooms(center_id, status);

      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS physical_room_id INT;
      INSERT INTO physical_rooms (center_id, name)
      SELECT center_id, min(trim(room_number))
      FROM rooms
      WHERE trim(room_number) <> ''
      GROUP BY center_id, lower(trim(room_number))
      ON CONFLICT DO NOTHING;
      UPDATE rooms r
      SET physical_room_id = pr.physical_room_id
      FROM physical_rooms pr
      WHERE r.physical_room_id IS NULL
        AND pr.center_id = r.center_id
        AND lower(trim(pr.name)) = lower(trim(r.room_number));
      CREATE INDEX IF NOT EXISTS idx_rooms_physical_room_id ON rooms(physical_room_id);
      DO $$ BEGIN
        ALTER TABLE rooms ADD CONSTRAINT rooms_physical_room_id_fkey
          FOREIGN KEY (physical_room_id) REFERENCES physical_rooms(physical_room_id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_physical_room_id_fkey;
      ALTER TABLE rooms DROP COLUMN IF EXISTS physical_room_id;
      DROP TABLE IF EXISTS physical_rooms;
    `);
  },
};
