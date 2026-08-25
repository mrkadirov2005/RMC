module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        ALTER TABLE teacher_tasks
          ALTER COLUMN teacher_id DROP NOT NULL;

        ALTER TABLE teacher_tasks
          ADD COLUMN IF NOT EXISTS assignee_type VARCHAR(20) NOT NULL DEFAULT 'teacher';

        ALTER TABLE teacher_tasks
          ADD COLUMN IF NOT EXISTS admin_id INT;

        ALTER TABLE teacher_tasks
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

        ALTER TABLE teacher_tasks
          ADD COLUMN IF NOT EXISTS status_note TEXT;

        ALTER TABLE teacher_tasks
          ADD CONSTRAINT teacher_tasks_admin_id_fkey
          FOREIGN KEY (admin_id) REFERENCES superusers(superuser_id) ON DELETE CASCADE;

        ALTER TABLE teacher_tasks
          ADD CONSTRAINT teacher_tasks_assignee_type_check
          CHECK (assignee_type IN ('teacher', 'admin'));

        ALTER TABLE teacher_tasks
          ADD CONSTRAINT teacher_tasks_status_check
          CHECK (status IN ('pending', 'accepted', 'rejected', 'done'));

        ALTER TABLE teacher_tasks
          ADD CONSTRAINT teacher_tasks_assignee_consistency_check
          CHECK (
            (assignee_type = 'teacher' AND teacher_id IS NOT NULL AND admin_id IS NULL)
            OR (assignee_type = 'admin' AND admin_id IS NOT NULL AND teacher_id IS NULL)
          );

        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_admin_id ON teacher_tasks(admin_id);
        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_status ON teacher_tasks(status);
        CREATE INDEX IF NOT EXISTS idx_teacher_tasks_assignee_type ON teacher_tasks(assignee_type);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_teacher_tasks_assignee_type;
        DROP INDEX IF EXISTS idx_teacher_tasks_status;
        DROP INDEX IF EXISTS idx_teacher_tasks_admin_id;

        ALTER TABLE teacher_tasks
          DROP CONSTRAINT IF EXISTS teacher_tasks_assignee_consistency_check;

        ALTER TABLE teacher_tasks
          DROP CONSTRAINT IF EXISTS teacher_tasks_status_check;

        ALTER TABLE teacher_tasks
          DROP CONSTRAINT IF EXISTS teacher_tasks_assignee_type_check;

        ALTER TABLE teacher_tasks
          DROP CONSTRAINT IF EXISTS teacher_tasks_admin_id_fkey;

        ALTER TABLE teacher_tasks
          DROP COLUMN IF EXISTS status_note;

        ALTER TABLE teacher_tasks
          DROP COLUMN IF EXISTS status;

        ALTER TABLE teacher_tasks
          DROP COLUMN IF EXISTS admin_id;

        ALTER TABLE teacher_tasks
          DROP COLUMN IF EXISTS assignee_type;

        ALTER TABLE teacher_tasks
          ALTER COLUMN teacher_id SET NOT NULL;
    `);
  },
};
