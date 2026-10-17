// A transfer reason for a student moved away because they didn't like the teacher. Transfers with
// it count against the old teacher's KPI retention.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO student_action_reasons (reason_type, reason_code, reason_name, active, created_at)
      VALUES ('transfer', 'disliked_teacher', 'Ustoz yoqmadi', true, CURRENT_TIMESTAMP)
      ON CONFLICT (reason_type, reason_code) DO UPDATE SET reason_name = EXCLUDED.reason_name, active = true;
    `);
  },

  async down(queryInterface) {
    // Kept if a transfer already uses it, so past transfers still show their reason.
    await queryInterface.sequelize.query(`
      DELETE FROM student_action_reasons r
      WHERE r.reason_type = 'transfer' AND r.reason_code = 'disliked_teacher'
        AND NOT EXISTS (SELECT 1 FROM students s WHERE s.transfer_reason_id = r.reason_id);
    `);
  },
};
