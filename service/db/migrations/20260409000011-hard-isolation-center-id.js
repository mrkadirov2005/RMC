module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE assignments a
      SET center_id = c.center_id
      FROM classes c
      WHERE a.class_id = c.class_id AND a.center_id IS NULL;
      ALTER TABLE assignments ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE assignments ADD CONSTRAINT fk_assignments_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_assignments_center_id ON assignments(center_id);

      ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE assignment_submissions s
      SET center_id = c.center_id
      FROM assignments a
      JOIN classes c ON c.class_id = a.class_id
      WHERE s.assignment_id = a.assignment_id AND s.center_id IS NULL;
      ALTER TABLE assignment_submissions ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE assignment_submissions ADD CONSTRAINT fk_assignment_submissions_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_assignment_submissions_center_id ON assignment_submissions(center_id);

      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE attendance t
      SET center_id = c.center_id
      FROM classes c
      WHERE t.class_id = c.class_id AND t.center_id IS NULL;
      ALTER TABLE attendance ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE attendance ADD CONSTRAINT fk_attendance_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_center_id ON attendance(center_id);

      ALTER TABLE grades ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE grades g
      SET center_id = s.center_id
      FROM students s
      WHERE g.student_id = s.student_id AND g.center_id IS NULL;
      ALTER TABLE grades ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE grades ADD CONSTRAINT fk_grades_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_grades_center_id ON grades(center_id);

      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE subjects s
      SET center_id = c.center_id
      FROM classes c
      WHERE s.class_id = c.class_id AND s.center_id IS NULL;
      ALTER TABLE subjects ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE subjects ADD CONSTRAINT fk_subjects_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_subjects_center_id ON subjects(center_id);

      ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE invoice_items i
      SET center_id = inv.center_id
      FROM invoices inv
      WHERE i.invoice_id = inv.invoice_id AND i.center_id IS NULL;
      ALTER TABLE invoice_items ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE invoice_items ADD CONSTRAINT fk_invoice_items_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_center_id ON invoice_items(center_id);

      ALTER TABLE payment_plan_installments ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE payment_plan_installments i
      SET center_id = p.center_id
      FROM payment_plans p
      WHERE i.plan_id = p.plan_id AND i.center_id IS NULL;
      ALTER TABLE payment_plan_installments ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE payment_plan_installments ADD CONSTRAINT fk_payment_plan_installments_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_center_id ON payment_plan_installments(center_id);

      ALTER TABLE notifications ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE notifications n
      SET center_id = COALESCE(
        (SELECT center_id FROM students WHERE student_id = n.user_id AND n.user_type = 'student'),
        (SELECT center_id FROM teachers WHERE teacher_id = n.user_id AND n.user_type = 'teacher'),
        (SELECT center_id FROM superusers WHERE superuser_id = n.user_id AND n.user_type = 'superuser')
      )
      WHERE n.center_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_notifications_center_id ON notifications(center_id);

      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE audit_logs a
      SET center_id = COALESCE(
        (SELECT center_id FROM students WHERE student_id = a.user_id AND a.user_type = 'student'),
        (SELECT center_id FROM teachers WHERE teacher_id = a.user_id AND a.user_type = 'teacher'),
        (SELECT center_id FROM superusers WHERE superuser_id = a.user_id AND a.user_type = 'superuser'),
        (SELECT center_id FROM edu_centers LIMIT 1)
      )
      WHERE a.center_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_audit_logs_center_id ON audit_logs(center_id);

      ALTER TABLE saved_filters ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE saved_filters f
      SET center_id = COALESCE(
        (SELECT center_id FROM students WHERE student_id = f.user_id AND f.user_type = 'student'),
        (SELECT center_id FROM teachers WHERE teacher_id = f.user_id AND f.user_type = 'teacher'),
        (SELECT center_id FROM superusers WHERE superuser_id = f.user_id AND f.user_type = 'superuser')
      )
      WHERE f.center_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_saved_filters_center_id ON saved_filters(center_id);

      ALTER TABLE parents ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE parents p
      SET center_id = x.center_id
      FROM (
        SELECT ps.parent_id, MIN(s.center_id) AS center_id
        FROM parent_students ps
        JOIN students s ON s.student_id = ps.student_id
        GROUP BY ps.parent_id
      ) x
      WHERE p.parent_id = x.parent_id AND p.center_id IS NULL;
      ALTER TABLE parents ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE parents ADD CONSTRAINT fk_parents_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_parents_center_id ON parents(center_id);

      ALTER TABLE parent_students ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE parent_students ps
      SET center_id = s.center_id
      FROM students s
      WHERE ps.student_id = s.student_id AND ps.center_id IS NULL;
      ALTER TABLE parent_students ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE parent_students ADD CONSTRAINT fk_parent_students_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_parent_students_center_id ON parent_students(center_id);

      ALTER TABLE test_assignments ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE test_assignments ta
      SET center_id = t.center_id
      FROM tests t
      WHERE ta.test_id = t.test_id AND ta.center_id IS NULL;
      ALTER TABLE test_assignments ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE test_assignments ADD CONSTRAINT fk_test_assignments_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_test_assignments_center_id ON test_assignments(center_id);

      ALTER TABLE reading_passages ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE reading_passages rp
      SET center_id = t.center_id
      FROM tests t
      WHERE rp.test_id = t.test_id AND rp.center_id IS NULL;
      ALTER TABLE reading_passages ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE reading_passages ADD CONSTRAINT fk_reading_passages_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_reading_passages_center_id ON reading_passages(center_id);

      ALTER TABLE test_questions ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE test_questions tq
      SET center_id = t.center_id
      FROM tests t
      WHERE tq.test_id = t.test_id AND tq.center_id IS NULL;
      ALTER TABLE test_questions ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE test_questions ADD CONSTRAINT fk_test_questions_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_test_questions_center_id ON test_questions(center_id);

      ALTER TABLE test_submissions ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE test_submissions ts
      SET center_id = t.center_id
      FROM tests t
      WHERE ts.test_id = t.test_id AND ts.center_id IS NULL;
      ALTER TABLE test_submissions ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE test_submissions ADD CONSTRAINT fk_test_submissions_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_test_submissions_center_id ON test_submissions(center_id);

      ALTER TABLE test_answers ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE test_answers ta
      SET center_id = ts.center_id
      FROM test_submissions ts
      WHERE ta.submission_id = ts.submission_id AND ta.center_id IS NULL;
      ALTER TABLE test_answers ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE test_answers ADD CONSTRAINT fk_test_answers_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_test_answers_center_id ON test_answers(center_id);

      ALTER TABLE test_results_summary ADD COLUMN IF NOT EXISTS center_id INT;
      UPDATE test_results_summary trs
      SET center_id = t.center_id
      FROM tests t
      WHERE trs.test_id = t.test_id AND trs.center_id IS NULL;
      ALTER TABLE test_results_summary ALTER COLUMN center_id SET NOT NULL;
      ALTER TABLE test_results_summary ADD CONSTRAINT fk_test_results_summary_center FOREIGN KEY (center_id) REFERENCES edu_centers(center_id);
      CREATE INDEX IF NOT EXISTS idx_test_results_summary_center_id ON test_results_summary(center_id);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE test_results_summary DROP CONSTRAINT IF EXISTS fk_test_results_summary_center;
      ALTER TABLE test_answers DROP CONSTRAINT IF EXISTS fk_test_answers_center;
      ALTER TABLE test_submissions DROP CONSTRAINT IF EXISTS fk_test_submissions_center;
      ALTER TABLE test_questions DROP CONSTRAINT IF EXISTS fk_test_questions_center;
      ALTER TABLE reading_passages DROP CONSTRAINT IF EXISTS fk_reading_passages_center;
      ALTER TABLE test_assignments DROP CONSTRAINT IF EXISTS fk_test_assignments_center;
      ALTER TABLE parent_students DROP CONSTRAINT IF EXISTS fk_parent_students_center;
      ALTER TABLE parents DROP CONSTRAINT IF EXISTS fk_parents_center;
      ALTER TABLE saved_filters DROP COLUMN IF EXISTS center_id;
      ALTER TABLE audit_logs DROP COLUMN IF EXISTS center_id;
      ALTER TABLE notifications DROP COLUMN IF EXISTS center_id;
      ALTER TABLE payment_plan_installments DROP CONSTRAINT IF EXISTS fk_payment_plan_installments_center;
      ALTER TABLE invoice_items DROP CONSTRAINT IF EXISTS fk_invoice_items_center;
      ALTER TABLE subjects DROP CONSTRAINT IF EXISTS fk_subjects_center;
      ALTER TABLE grades DROP CONSTRAINT IF EXISTS fk_grades_center;
      ALTER TABLE attendance DROP CONSTRAINT IF EXISTS fk_attendance_center;
      ALTER TABLE assignment_submissions DROP CONSTRAINT IF EXISTS fk_assignment_submissions_center;
      ALTER TABLE assignments DROP CONSTRAINT IF EXISTS fk_assignments_center;
    `);
  },
};
