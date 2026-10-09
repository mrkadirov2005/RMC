module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- Students who come together: siblings, relatives or friends. Parents usually ask about them
      -- together, and they tend to join or leave together.
      CREATE TABLE IF NOT EXISTS student_link_groups (
        link_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        relation_type VARCHAR(20) NOT NULL CHECK (relation_type IN ('siblings', 'relatives', 'friends')),
        note TEXT,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS student_link_members (
        link_id INTEGER NOT NULL REFERENCES student_link_groups(link_id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
        PRIMARY KEY (link_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_student_link_groups_center ON student_link_groups (center_id);
      CREATE INDEX IF NOT EXISTS idx_student_link_members_student ON student_link_members (student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS student_link_members;
      DROP TABLE IF EXISTS student_link_groups;
    `);
  },
};
