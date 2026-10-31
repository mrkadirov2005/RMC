module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      -- @MOB-050 Homework Bank: Level -> Book -> Unit -> Lesson -> Task. center_id NULL = shared by all centers.
      CREATE TABLE IF NOT EXISTS hw_levels (
        level_id SERIAL PRIMARY KEY,
        center_id INTEGER,
        name VARCHAR(100) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS hw_books (
        book_id SERIAL PRIMARY KEY,
        level_id INTEGER NOT NULL REFERENCES hw_levels(level_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS hw_units (
        unit_id SERIAL PRIMARY KEY,
        book_id INTEGER NOT NULL REFERENCES hw_books(book_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS hw_lessons (
        lesson_id SERIAL PRIMARY KEY,
        unit_id INTEGER NOT NULL REFERENCES hw_units(unit_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      -- @MOB-051 One task = instructions + questions in one JSON shape for every skill.
      CREATE TABLE IF NOT EXISTS hw_tasks (
        task_id SERIAL PRIMARY KEY,
        lesson_id INTEGER NOT NULL REFERENCES hw_lessons(lesson_id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        skill VARCHAR(20) NOT NULL CHECK (skill IN ('vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'other')),
        instructions TEXT,
        content JSONB NOT NULL,
        max_score NUMERIC(8,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved')),
        created_by_name VARCHAR(255),
        approved_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hw_tasks_lesson ON hw_tasks (lesson_id);

      -- @MOB-053 A task given to a group. open_after_lesson: hidden until the group's next lesson after
      -- it was assigned has ended.
      CREATE TABLE IF NOT EXISTS hw_assignments (
        assignment_id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES hw_tasks(task_id),
        center_id INTEGER NOT NULL,
        class_id INTEGER NOT NULL,
        due_at TIMESTAMP,
        open_after_lesson BOOLEAN NOT NULL DEFAULT FALSE,
        created_by_type VARCHAR(20),
        created_by_id INTEGER,
        created_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_hw_assignments_class ON hw_assignments (class_id) WHERE deleted_at IS NULL;

      -- @MOB-054 One submission per student (main record) and assignment; answers autosave until submitted.
      CREATE TABLE IF NOT EXISTS hw_submissions (
        submission_id SERIAL PRIMARY KEY,
        assignment_id INTEGER NOT NULL REFERENCES hw_assignments(assignment_id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL,
        answers JSONB NOT NULL DEFAULT '{}'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'reviewed')),
        auto_score NUMERIC(8,2),
        score NUMERIC(8,2),
        max_score NUMERIC(8,2),
        feedback TEXT,
        coins_awarded INTEGER,
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by_name VARCHAR(255),
        UNIQUE (assignment_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_hw_submissions_student ON hw_submissions (student_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS hw_submissions;
      DROP TABLE IF EXISTS hw_assignments;
      DROP TABLE IF EXISTS hw_tasks;
      DROP TABLE IF EXISTS hw_lessons;
      DROP TABLE IF EXISTS hw_units;
      DROP TABLE IF EXISTS hw_books;
      DROP TABLE IF EXISTS hw_levels;
    `);
  },
};
