'use strict';

// Teacher KPI in seven parts: besides student score, retention, contribution and teaching
// quality, a monthly exam score (entered), on-time scoring (from lesson control) and the number
// of new students who came asking for the teacher (+1 point each).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teacher_kpis
        ADD COLUMN IF NOT EXISTS exam_score numeric,
        ADD COLUMN IF NOT EXISTS grading_score numeric,
        ADD COLUMN IF NOT EXISTS referral_count integer NOT NULL DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE teacher_kpis
        DROP COLUMN IF EXISTS exam_score,
        DROP COLUMN IF EXISTS grading_score,
        DROP COLUMN IF EXISTS referral_count;
    `);
  },
};
