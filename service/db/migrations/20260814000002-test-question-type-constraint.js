module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE test_questions
        SET question_type = 'short_answer'
        WHERE question_type IS NULL OR question_type NOT IN (
          'multiple_choice', 'form_filling', 'essay', 'short_answer',
          'true_false', 'matching', 'reading_passage', 'writing'
        );

      ALTER TABLE test_questions DROP CONSTRAINT IF EXISTS test_questions_question_type_check;
      ALTER TABLE test_questions ADD CONSTRAINT test_questions_question_type_check
        CHECK (question_type IN (
          'multiple_choice', 'form_filling', 'essay', 'short_answer',
          'true_false', 'matching', 'reading_passage', 'writing'
        ));

      ALTER TABLE test_questions
        ADD COLUMN IF NOT EXISTS rubric TEXT;
    `);
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE test_questions DROP CONSTRAINT IF EXISTS test_questions_question_type_check;
      ALTER TABLE test_questions DROP COLUMN IF EXISTS rubric;
    `);
  },
};
