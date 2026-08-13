module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM test_answers a
      USING test_answers b
      WHERE a.submission_id = b.submission_id
        AND a.question_id = b.question_id
        AND a.answer_id < b.answer_id;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_test_answers_submission_question
        ON test_answers (submission_id, question_id);

      ALTER TABLE test_answers
        ADD COLUMN IF NOT EXISTS graded_by INTEGER,
        ADD COLUMN IF NOT EXISTS graded_by_type VARCHAR(20);
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE test_answers DROP COLUMN IF EXISTS graded_by;
      ALTER TABLE test_answers DROP COLUMN IF EXISTS graded_by_type;
      DROP INDEX IF EXISTS idx_test_answers_submission_question;
    `);
  },
};
