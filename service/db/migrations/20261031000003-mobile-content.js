module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-060 Official links shown in the app (Telegram, Instagram, website). center_id NULL = every center.
      CREATE TABLE IF NOT EXISTS mobile_links (
        link_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        title VARCHAR(150) NOT NULL,
        url TEXT NOT NULL,
        icon VARCHAR(20),
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_links_center ON mobile_links (center_id);

      -- @MOB-061 Announcements for students, parents or both, optionally one group.
      CREATE TABLE IF NOT EXISTS mobile_announcements (
        announcement_id SERIAL PRIMARY KEY,
        center_id INTEGER NOT NULL,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        audience VARCHAR(20) NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'student', 'parent')),
        class_id INTEGER,
        send_push BOOLEAN NOT NULL DEFAULT FALSE,
        published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_announcements_center ON mobile_announcements (center_id, published_at DESC) WHERE deleted_at IS NULL;

      -- @MOB-062 School rules. Each publish adds a version; a version that requires acceptance must
      -- be accepted again by everyone.
      CREATE TABLE IF NOT EXISTS mobile_policies (
        policy_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        title VARCHAR(200) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        current_version INTEGER NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS mobile_policy_versions (
        policy_id INTEGER NOT NULL REFERENCES mobile_policies(policy_id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        body TEXT NOT NULL,
        requires_acceptance BOOLEAN NOT NULL DEFAULT TRUE,
        published_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_by_name VARCHAR(255),
        PRIMARY KEY (policy_id, version)
      );
      CREATE TABLE IF NOT EXISTS mobile_policy_acceptances (
        policy_id INTEGER NOT NULL REFERENCES mobile_policies(policy_id) ON DELETE CASCADE,
        version INTEGER NOT NULL,
        user_type VARCHAR(20) NOT NULL,
        user_id INTEGER NOT NULL,
        accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (policy_id, version, user_type, user_id)
      );

      -- @MOB-063 Help, complaints, thanks and suggestions from students and parents.
      CREATE TABLE IF NOT EXISTS mobile_help_requests (
        request_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'parent')),
        user_id INTEGER NOT NULL,
        student_id INTEGER,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('help', 'complaint', 'thanks', 'suggestion')),
        message TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'resolved')),
        response TEXT,
        handled_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_mobile_help_requests_center ON mobile_help_requests (center_id, status, request_id DESC);
      CREATE INDEX IF NOT EXISTS idx_mobile_help_requests_user ON mobile_help_requests (user_type, user_id, request_id DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS mobile_help_requests;
      DROP TABLE IF EXISTS mobile_policy_acceptances;
      DROP TABLE IF EXISTS mobile_policy_versions;
      DROP TABLE IF EXISTS mobile_policies;
      DROP TABLE IF EXISTS mobile_announcements;
      DROP TABLE IF EXISTS mobile_links;
    `);
  },
};
