const pool = require('../../db/pool');

const query = (text: string, params: any[] = []) => pool.query(text, params).then((r: any) => r.rows);
const one = async (text: string, params: any[] = []) => (await query(text, params))[0] || null;

// ---------------- Bank (@MOB-052) ----------------
const bank = async (centerId: number | null) => {
  const levels = await query(
    `SELECT level_id, center_id, name, sort_order FROM hw_levels WHERE ($1::int IS NULL OR center_id IS NULL OR center_id = $1)
     ORDER BY sort_order, level_id`,
    [centerId],
  );
  const levelIds = levels.map((l: any) => l.level_id);
  const books = await query('SELECT * FROM hw_books WHERE level_id = ANY($1::int[]) ORDER BY sort_order, book_id', [levelIds]);
  const units = await query('SELECT * FROM hw_units WHERE book_id = ANY($1::int[]) ORDER BY sort_order, unit_id', [books.map((b: any) => b.book_id)]);
  const lessons = await query(
    `SELECT l.*, COUNT(t.task_id)::int AS task_count, COUNT(t.task_id) FILTER (WHERE t.status = 'approved')::int AS approved_count
     FROM hw_lessons l LEFT JOIN hw_tasks t ON t.lesson_id = l.lesson_id
     WHERE l.unit_id = ANY($1::int[]) GROUP BY l.lesson_id ORDER BY l.sort_order, l.lesson_id`,
    [units.map((u: any) => u.unit_id)],
  );
  return { levels, books, units, lessons };
};

const NODE_SQL: Record<string, string> = {
  level: 'INSERT INTO hw_levels (center_id, name, sort_order) VALUES ($1, $2, $3) RETURNING level_id AS id, name',
  book: 'INSERT INTO hw_books (level_id, title, sort_order) VALUES ($1, $2, $3) RETURNING book_id AS id, title',
  unit: 'INSERT INTO hw_units (book_id, title, sort_order) VALUES ($1, $2, $3) RETURNING unit_id AS id, title',
  lesson: 'INSERT INTO hw_lessons (unit_id, title, sort_order) VALUES ($1, $2, $3) RETURNING lesson_id AS id, title',
};
const createNode = (kind: string, parentId: number | null, title: string, sortOrder: number) => one(NODE_SQL[kind], [parentId, title, sortOrder]);

// Which center a bank node belongs to (NULL = shared), so admins only change their own.
const PARENT_CENTER_SQL: Record<string, string> = {
  level: 'SELECT center_id FROM hw_levels WHERE level_id = $1',
  book: 'SELECT lv.center_id FROM hw_books b JOIN hw_levels lv ON lv.level_id = b.level_id WHERE b.book_id = $1',
  unit: `SELECT lv.center_id FROM hw_units u JOIN hw_books b ON b.book_id = u.book_id JOIN hw_levels lv ON lv.level_id = b.level_id WHERE u.unit_id = $1`,
  lesson: `SELECT lv.center_id FROM hw_lessons ls JOIN hw_units u ON u.unit_id = ls.unit_id JOIN hw_books b ON b.book_id = u.book_id
           JOIN hw_levels lv ON lv.level_id = b.level_id WHERE ls.lesson_id = $1`,
};
const nodeCenter = async (kind: string, id: number) => {
  const row = await one(PARENT_CENTER_SQL[kind], [id]);
  return row ? { center_id: row.center_id == null ? null : Number(row.center_id) } : null;
};

// ---------------- Tasks (@MOB-051 @MOB-052) ----------------
const taskSelect = `SELECT t.*, ls.title AS lesson_title, lv.center_id
  FROM hw_tasks t JOIN hw_lessons ls ON ls.lesson_id = t.lesson_id JOIN hw_units u ON u.unit_id = ls.unit_id
  JOIN hw_books b ON b.book_id = u.book_id JOIN hw_levels lv ON lv.level_id = b.level_id`;

const listTasks = (lessonId: number) => query(`${taskSelect} WHERE t.lesson_id = $1 ORDER BY t.task_id`, [lessonId]);
const getTask = (taskId: number) => one(`${taskSelect} WHERE t.task_id = $1`, [taskId]);

const createTask = (t: any) =>
  one(
    `INSERT INTO hw_tasks (lesson_id, title, skill, instructions, content, max_score, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [t.lesson_id, t.title, t.skill, t.instructions ?? null, JSON.stringify(t.content), t.max_score, t.created_by_name ?? null],
  );

// Editing sends an approved task back to draft, so changed content is approved again.
const updateTask = (taskId: number, t: any) =>
  one(
    `UPDATE hw_tasks SET title = $2, skill = $3, instructions = $4, content = $5, max_score = $6, status = 'draft',
            approved_by_name = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE task_id = $1 RETURNING *`,
    [taskId, t.title, t.skill, t.instructions ?? null, JSON.stringify(t.content), t.max_score],
  );

const approveTask = (taskId: number, name: string | null) =>
  one(
    `UPDATE hw_tasks SET status = 'approved', approved_by_name = $2, updated_at = CURRENT_TIMESTAMP WHERE task_id = $1 RETURNING *`,
    [taskId, name],
  );

// ---------------- Assignments (@MOB-053) ----------------
const classInfo = (classId: number) => one('SELECT class_id, center_id, teacher_id, class_name FROM classes WHERE class_id = $1 AND deleted_at IS NULL', [classId]);

const createAssignment = (a: any) =>
  one(
    `INSERT INTO hw_assignments (task_id, center_id, class_id, due_at, open_after_lesson, created_by_type, created_by_id, created_by_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [a.task_id, a.center_id, a.class_id, a.due_at ?? null, Boolean(a.open_after_lesson), a.created_by_type, a.created_by_id, a.created_by_name ?? null],
  );

// Open when not waiting for a lesson, or once the group's next lesson after assigning has ended.
const IS_OPEN = `(NOT a.open_after_lesson OR EXISTS (
  SELECT 1 FROM sessions s WHERE s.class_id = a.class_id AND s.deleted_at IS NULL
    AND (s.session_date + COALESCE(s.start_time, '00:00'::time)) >= a.created_at
    AND (s.session_date + COALESCE(s.end_time, s.start_time, '23:59'::time)) <= LOCALTIMESTAMP))`;

const listAssignments = (centerId: number | null, classId: number | null, teacherId: number | null) =>
  query(
    `SELECT a.*, t.title AS task_title, t.skill, t.max_score, c.class_name, ${IS_OPEN} AS is_open,
            (SELECT COUNT(*)::int FROM hw_submissions x WHERE x.assignment_id = a.assignment_id AND x.status <> 'in_progress') AS submitted_count,
            (SELECT COUNT(*)::int FROM hw_submissions x WHERE x.assignment_id = a.assignment_id AND x.status = 'submitted') AS to_review_count
     FROM hw_assignments a JOIN hw_tasks t ON t.task_id = a.task_id JOIN classes c ON c.class_id = a.class_id
     WHERE a.deleted_at IS NULL AND ($1::int IS NULL OR a.center_id = $1) AND ($2::int IS NULL OR a.class_id = $2)
       AND ($3::int IS NULL OR c.teacher_id = $3)
     ORDER BY a.created_at DESC LIMIT 300`,
    [centerId, classId, teacherId],
  );

const getAssignment = (id: number) =>
  one(
    `SELECT a.*, c.teacher_id, c.class_name FROM hw_assignments a JOIN classes c ON c.class_id = a.class_id
     WHERE a.assignment_id = $1 AND a.deleted_at IS NULL`,
    [id],
  );

const deleteAssignment = (id: number) =>
  one('UPDATE hw_assignments SET deleted_at = CURRENT_TIMESTAMP WHERE assignment_id = $1 AND deleted_at IS NULL RETURNING assignment_id', [id]);

// ---------------- Students (@MOB-054) ----------------
// Groups of a child's every active record, keyed by their main (login) record.
const studentClasses = (param: string) => `SELECT class_id FROM students
  WHERE (student_id = ${param} OR main_student_id = ${param}) AND deleted_at IS NULL AND status IS DISTINCT FROM 'Transferred' AND class_id IS NOT NULL`;

const studentAssignments = (mainId: number) =>
  query(
    `SELECT a.assignment_id, a.due_at, a.created_at, t.title, t.skill, t.instructions, t.max_score, c.class_name,
            x.status AS submission_status, x.score, x.auto_score, x.feedback, x.submitted_at, x.reviewed_at
     FROM hw_assignments a JOIN hw_tasks t ON t.task_id = a.task_id JOIN classes c ON c.class_id = a.class_id
     LEFT JOIN hw_submissions x ON x.assignment_id = a.assignment_id AND x.student_id = $1
     WHERE a.deleted_at IS NULL AND a.class_id IN (${studentClasses('$1')}) AND ${IS_OPEN}
     ORDER BY COALESCE(a.due_at, a.created_at + INTERVAL '30 days') ASC, a.assignment_id DESC
     LIMIT 200`,
    [mainId],
  );

const studentAssignment = (assignmentId: number, mainId: number) =>
  one(
    `SELECT a.assignment_id, a.due_at, t.task_id, t.title, t.skill, t.instructions, t.content, t.max_score, c.class_name,
            x.submission_id, x.answers, x.status AS submission_status, x.score, x.auto_score, x.feedback, x.submitted_at, x.reviewed_at
     FROM hw_assignments a JOIN hw_tasks t ON t.task_id = a.task_id JOIN classes c ON c.class_id = a.class_id
     LEFT JOIN hw_submissions x ON x.assignment_id = a.assignment_id AND x.student_id = $2
     WHERE a.assignment_id = $1 AND a.deleted_at IS NULL AND a.class_id IN (${studentClasses('$2')}) AND ${IS_OPEN}`,
    [assignmentId, mainId],
  );

// Autosave: only while the submission is still in progress.
const saveAnswers = (assignmentId: number, mainId: number, answers: any) =>
  one(
    `INSERT INTO hw_submissions (assignment_id, student_id, answers) VALUES ($1, $2, $3)
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET answers = EXCLUDED.answers, saved_at = CURRENT_TIMESTAMP
       WHERE hw_submissions.status = 'in_progress'
     RETURNING submission_id, status, saved_at`,
    [assignmentId, mainId, JSON.stringify(answers ?? {})],
  );

const submit = (assignmentId: number, mainId: number, s: any) =>
  one(
    `INSERT INTO hw_submissions (assignment_id, student_id, answers, status, auto_score, score, max_score, submitted_at, reviewed_at)
     VALUES ($1, $2, $3, $4::varchar, $5, $6, $7, CURRENT_TIMESTAMP, CASE WHEN $4::varchar = 'reviewed' THEN CURRENT_TIMESTAMP END)
     ON CONFLICT (assignment_id, student_id) DO UPDATE SET answers = EXCLUDED.answers, status = EXCLUDED.status,
       auto_score = EXCLUDED.auto_score, score = EXCLUDED.score, max_score = EXCLUDED.max_score,
       submitted_at = EXCLUDED.submitted_at, reviewed_at = EXCLUDED.reviewed_at, saved_at = CURRENT_TIMESTAMP
       WHERE hw_submissions.status = 'in_progress'
     RETURNING *`,
    [assignmentId, mainId, JSON.stringify(s.answers ?? {}), s.status, s.auto_score, s.score, s.max_score],
  );

// ---------------- Review (@MOB-056) ----------------
const submissionsFor = (assignmentId: number) =>
  query(
    `SELECT x.*, s.first_name, s.last_name FROM hw_submissions x JOIN students s ON s.student_id = x.student_id
     WHERE x.assignment_id = $1 ORDER BY x.status = 'submitted' DESC, x.submitted_at DESC NULLS LAST`,
    [assignmentId],
  );

const getSubmission = (submissionId: number) =>
  one(
    `SELECT x.*, a.class_id, a.center_id, c.teacher_id, t.title, t.content, t.max_score AS task_max_score, s.first_name
     FROM hw_submissions x JOIN hw_assignments a ON a.assignment_id = x.assignment_id JOIN classes c ON c.class_id = a.class_id
     JOIN hw_tasks t ON t.task_id = a.task_id JOIN students s ON s.student_id = x.student_id
     WHERE x.submission_id = $1`,
    [submissionId],
  );

const review = (submissionId: number, r: any) =>
  one(
    `UPDATE hw_submissions SET score = $2, feedback = $3, status = 'reviewed', reviewed_at = CURRENT_TIMESTAMP,
            reviewed_by_name = $4, coins_awarded = $5
     WHERE submission_id = $1 AND status <> 'in_progress' RETURNING *`,
    [submissionId, r.score, r.feedback ?? null, r.reviewed_by_name ?? null, r.coins ?? null],
  );

const setCoinsAwarded = (submissionId: number, coins: number) =>
  query('UPDATE hw_submissions SET coins_awarded = $2 WHERE submission_id = $1', [submissionId, coins]);

module.exports = {
  bank,
  createNode,
  nodeCenter,
  listTasks,
  getTask,
  createTask,
  updateTask,
  approveTask,
  classInfo,
  createAssignment,
  listAssignments,
  getAssignment,
  deleteAssignment,
  studentAssignments,
  studentAssignment,
  saveAnswers,
  submit,
  submissionsFor,
  getSubmission,
  review,
  setCoinsAwarded,
};

export {};
