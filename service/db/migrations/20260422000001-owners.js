module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE owner_status AS ENUM ('Active', 'Inactive', 'Suspended');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS owners (
        owner_id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        status owner_status DEFAULT 'Active',
        last_login TIMESTAMP,
        login_attempts INT DEFAULT 0,
        is_locked BOOLEAN DEFAULT FALSE,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_owner_username ON owners(username);
      CREATE INDEX IF NOT EXISTS idx_owner_status ON owners(status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS owners CASCADE;
      DROP TYPE IF EXISTS owner_status CASCADE;
    `);
  },
};
