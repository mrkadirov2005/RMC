module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS teacher_kpis (
          kpi_id SERIAL PRIMARY KEY,
          center_id INT,
          teacher_id INT NOT NULL,
          kpi_year INT NOT NULL,
          kpi_month INT NOT NULL,
          student_score NUMERIC(5,2) NOT NULL DEFAULT 0,
          retention_score NUMERIC(5,2) NOT NULL DEFAULT 0,
          contribution_score NUMERIC(5,2) NOT NULL DEFAULT 0,
          teaching_quality_score NUMERIC(5,2) NOT NULL DEFAULT 0,
          final_score NUMERIC(5,2) NOT NULL DEFAULT 0,
          notes TEXT,
          marked_by_id INT,
          marked_by_user_type VARCHAR(20),
          marked_by_role VARCHAR(50),
          marked_by_name VARCHAR(200),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE,
          CONSTRAINT chk_teacher_kpis_month CHECK (kpi_month BETWEEN 1 AND 12),
          CONSTRAINT uq_teacher_kpis_teacher_period UNIQUE (teacher_id, kpi_year, kpi_month)
      );

        CREATE INDEX IF NOT EXISTS idx_teacher_kpis_teacher_id ON teacher_kpis(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_kpis_center_id ON teacher_kpis(center_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_kpis_period ON teacher_kpis(kpi_year, kpi_month);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS teacher_kpis CASCADE;
    `);
  },
};
