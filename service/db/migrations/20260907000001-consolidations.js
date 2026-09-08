module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS consolidation_sets (
          consolidation_set_id SERIAL PRIMARY KEY,
          center_id INT,
          class_id INT,
          session_id INT NOT NULL,
          teacher_id INT NOT NULL,
          title VARCHAR(255),
          violation_limit INT NOT NULL DEFAULT 3,
          share_token VARCHAR(64) NOT NULL UNIQUE,
          deleted_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
          FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE
      );

        CREATE INDEX IF NOT EXISTS idx_consolidation_sets_session ON consolidation_sets(session_id);
        CREATE INDEX IF NOT EXISTS idx_consolidation_sets_class ON consolidation_sets(class_id);
        CREATE INDEX IF NOT EXISTS idx_consolidation_sets_center ON consolidation_sets(center_id);
        CREATE INDEX IF NOT EXISTS idx_consolidation_sets_deleted_at ON consolidation_sets(deleted_at);

        CREATE TABLE IF NOT EXISTS consolidation_words (
          consolidation_word_id SERIAL PRIMARY KEY,
          consolidation_set_id INT NOT NULL,
          word_order INT NOT NULL,
          main_word VARCHAR(255) NOT NULL,
          translations JSONB NOT NULL,
          FOREIGN KEY (consolidation_set_id) REFERENCES consolidation_sets(consolidation_set_id) ON DELETE CASCADE
      );

        CREATE INDEX IF NOT EXISTS idx_consolidation_words_set ON consolidation_words(consolidation_set_id);

        CREATE TABLE IF NOT EXISTS consolidation_trials (
          trial_id SERIAL PRIMARY KEY,
          consolidation_set_id INT NOT NULL,
          student_id INT NOT NULL,
          center_id INT,
          trial_number INT NOT NULL,
          status VARCHAR(20) NOT NULL,
          started_at TIMESTAMP NOT NULL,
          submitted_at TIMESTAMP,
          correct_count INT,
          total_words INT,
          is_passed BOOLEAN,
          violation_count INT NOT NULL DEFAULT 0,
          time_taken_seconds INT,
          via_share_link BOOLEAN NOT NULL DEFAULT false,
          ip_address VARCHAR(50),
          user_agent TEXT,
          access_token VARCHAR(64),
          FOREIGN KEY (consolidation_set_id) REFERENCES consolidation_sets(consolidation_set_id) ON DELETE CASCADE,
          FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
          CONSTRAINT uq_consolidation_trials_set_student_number UNIQUE (consolidation_set_id, student_id, trial_number)
      );

        CREATE INDEX IF NOT EXISTS idx_consolidation_trials_set ON consolidation_trials(consolidation_set_id);
        CREATE INDEX IF NOT EXISTS idx_consolidation_trials_student ON consolidation_trials(student_id);
        CREATE INDEX IF NOT EXISTS idx_consolidation_trials_status ON consolidation_trials(status);

        CREATE TABLE IF NOT EXISTS consolidation_answers (
          answer_id SERIAL PRIMARY KEY,
          trial_id INT NOT NULL,
          consolidation_word_id INT NOT NULL,
          student_answer TEXT,
          is_correct BOOLEAN NOT NULL,
          FOREIGN KEY (trial_id) REFERENCES consolidation_trials(trial_id) ON DELETE CASCADE,
          FOREIGN KEY (consolidation_word_id) REFERENCES consolidation_words(consolidation_word_id) ON DELETE CASCADE,
          CONSTRAINT uq_consolidation_answers_trial_word UNIQUE (trial_id, consolidation_word_id)
      );

        CREATE INDEX IF NOT EXISTS idx_consolidation_answers_trial ON consolidation_answers(trial_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS consolidation_answers CASCADE;
      DROP TABLE IF EXISTS consolidation_trials CASCADE;
      DROP TABLE IF EXISTS consolidation_words CASCADE;
      DROP TABLE IF EXISTS consolidation_sets CASCADE;
    `);
  },
};
