module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS teacher_tasks (
          task_id SERIAL PRIMARY KEY,
          center_id INT,
          teacher_id INT NOT NULL,
          created_by INT,
          task_title VARCHAR(255) NOT NULL,
          task_definition TEXT,
          deadline TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE
      );

        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_teacher_id ON teacher_tasks(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_center_id ON teacher_tasks(center_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_deadline ON teacher_tasks(deadline);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS teacher_tasks CASCADE;
    `);
  },
};
