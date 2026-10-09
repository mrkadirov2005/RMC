module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- People an admin talked to who are not in a group yet: waiting for a suitable group, or being
      -- gathered for a new one. call_back_on is the day the admin promised to call back.
      CREATE TABLE IF NOT EXISTS leads (
        lead_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        stage VARCHAR(20) NOT NULL CHECK (stage IN ('waiting_group', 'new_group')),
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        parent_phone VARCHAR(50),
        subject VARCHAR(255),
        level VARCHAR(50),
        preferred_time VARCHAR(255),
        note TEXT,
        call_back_on DATE,
        outcome VARCHAR(20) CHECK (outcome IN ('enrolled', 'lost')),
        outcome_note TEXT,
        closed_at TIMESTAMP,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_leads_center_open ON leads (center_id, stage) WHERE closed_at IS NULL AND deleted_at IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS leads;');
  },
};
