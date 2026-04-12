module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TYPE notification_type AS ENUM ('info', 'warning', 'alert', 'success');

      CREATE TABLE notifications (
          notification_id SERIAL PRIMARY KEY,
          user_type VARCHAR(20) NOT NULL,
          user_id INT NOT NULL,
          title VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          type notification_type DEFAULT 'info',
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_notifications_user ON notifications(user_type, user_id, is_read);

      CREATE TABLE audit_logs (
          audit_id SERIAL PRIMARY KEY,
          user_type VARCHAR(20) NOT NULL,
          user_id INT NOT NULL,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT,
          details JSONB,
          ip_address VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
      CREATE INDEX idx_audit_logs_user ON audit_logs(user_type, user_id);

      CREATE TABLE saved_filters (
          filter_id SERIAL PRIMARY KEY,
          user_type VARCHAR(20) NOT NULL,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          entity VARCHAR(50) NOT NULL,
          filters_json JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX idx_saved_filters_user ON saved_filters(user_type, user_id, entity);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS saved_filters CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TYPE IF EXISTS notification_type CASCADE;
    `);
  },
};
