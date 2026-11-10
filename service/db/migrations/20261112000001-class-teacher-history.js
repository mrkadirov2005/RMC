// Which teacher taught a group, from which day. A trigger on classes records every new group and
// every teacher change, whatever code path makes it, so a student's journey can show the teacher
// they actually had. Groups that exist today get one row: their current teacher since the group
// was created (earlier swaps were never recorded).
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS class_teacher_history (
        history_id SERIAL PRIMARY KEY,
        class_id INTEGER NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
        teacher_id INTEGER,
        previous_teacher_id INTEGER,
        changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        -- 'created': the group's first teacher; 'changed': a later swap; 'backfill': current
        -- teacher of a group that existed before this table.
        source VARCHAR(20) NOT NULL DEFAULT 'changed'
      );
      CREATE INDEX IF NOT EXISTS idx_class_teacher_history_class ON class_teacher_history (class_id, changed_at);

      CREATE OR REPLACE FUNCTION record_class_teacher() RETURNS trigger
      LANGUAGE plpgsql AS $fn$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          INSERT INTO class_teacher_history (class_id, teacher_id, changed_at, source)
          VALUES (NEW.class_id, NEW.teacher_id, COALESCE(NEW.created_at, CURRENT_TIMESTAMP), 'created');
        ELSIF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id THEN
          INSERT INTO class_teacher_history (class_id, teacher_id, previous_teacher_id, changed_at, source)
          VALUES (NEW.class_id, NEW.teacher_id, OLD.teacher_id, CURRENT_TIMESTAMP, 'changed');
        END IF;
        RETURN NEW;
      END
      $fn$;

      DROP TRIGGER IF EXISTS trg_class_teacher_history ON classes;
      CREATE TRIGGER trg_class_teacher_history
        AFTER INSERT OR UPDATE OF teacher_id ON classes
        FOR EACH ROW EXECUTE FUNCTION record_class_teacher();

      INSERT INTO class_teacher_history (class_id, teacher_id, changed_at, source)
      SELECT c.class_id, c.teacher_id, COALESCE(c.created_at, TIMESTAMP '2000-01-01'), 'backfill'
      FROM classes c
      WHERE NOT EXISTS (SELECT 1 FROM class_teacher_history h WHERE h.class_id = c.class_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_class_teacher_history ON classes;
      DROP FUNCTION IF EXISTS record_class_teacher();
      DROP TABLE IF EXISTS class_teacher_history;
    `);
  },
};
