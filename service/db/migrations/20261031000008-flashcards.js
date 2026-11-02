module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-145 Spaced repetition per student and word. The words are the consolidation words of the
      -- student's groups; a row appears the first time the student reviews a word.
      CREATE TABLE IF NOT EXISTS flashcard_reviews (
        student_id INTEGER NOT NULL,
        consolidation_word_id INTEGER NOT NULL REFERENCES consolidation_words(consolidation_word_id) ON DELETE CASCADE,
        ease NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
        interval_days INTEGER NOT NULL DEFAULT 0,
        repetitions INTEGER NOT NULL DEFAULT 0,
        lapses INTEGER NOT NULL DEFAULT 0,
        due_at TIMESTAMP NOT NULL,
        last_grade VARCHAR(10),
        review_count INTEGER NOT NULL DEFAULT 0,
        first_reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (student_id, consolidation_word_id)
      );
      CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_due ON flashcard_reviews (student_id, due_at);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS flashcard_reviews;');
  },
};
