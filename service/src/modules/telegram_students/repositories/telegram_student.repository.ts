const pool = require('../../../db/pool');

const resolveStudent = async (telegramUserId: string) => {
  const result = await pool.query(
    `SELECT
       r.registration_id,
       r.telegram_user_id,
       r.telegram_chat_id,
       r.telegram_username,
       s.student_id,
       s.center_id,
       s.class_id,
       s.teacher_id,
       s.first_name,
       s.last_name,
       s.status,
       s.coins,
       c.class_name,
       c.class_code,
       t.first_name AS teacher_first_name,
       t.last_name AS teacher_last_name
     FROM telegram_student_registrations r
     JOIN students s ON s.student_id = r.converted_student_id AND s.deleted_at IS NULL
     LEFT JOIN classes c ON c.class_id = s.class_id AND c.deleted_at IS NULL
     LEFT JOIN teachers t ON t.teacher_id = s.teacher_id AND t.deleted_at IS NULL
     WHERE r.telegram_user_id = $1
       AND r.converted_student_id IS NOT NULL
       AND LOWER(r.status) = 'imported'
     ORDER BY r.converted_at DESC NULLS LAST, r.registration_id DESC
     LIMIT 1`,
    [telegramUserId]
  );
  return result.rows[0] || null;
};

const findLastLesson = async (studentId: number) => {
  const result = await pool.query(
    `WITH latest_grade AS (
       SELECT g.*
       FROM grades g
       JOIN sessions se ON se.session_id = g.session_id AND se.deleted_at IS NULL
       WHERE g.student_id = $1
       ORDER BY se.session_date DESC, se.start_time DESC, g.grade_id DESC
       LIMIT 1
     ),
     lesson_rank AS (
       SELECT
         g.student_id,
         RANK() OVER (
           ORDER BY COALESCE(g.percentage, 0) DESC,
                    COALESCE(g.marks_obtained, 0) DESC,
                    COALESCE(g.total_daily_coin, 0) DESC,
                    g.grade_id ASC
         )::int AS rank,
         COUNT(*) OVER ()::int AS total_students
       FROM grades g
       JOIN latest_grade lg ON lg.session_id = g.session_id
     ),
     lesson_coins AS (
       SELECT COALESCE(SUM(delta), 0)::int AS coins_given
       FROM student_coin_transactions tx
       JOIN latest_grade lg ON lg.student_id = tx.student_id
       WHERE tx.student_id = $1
         AND tx.source_type = 'lesson_session'
         AND tx.source_id = lg.session_id
     )
     SELECT
       lg.grade_id,
       lg.session_id,
       lg.marks_obtained,
       lg.total_marks,
       lg.percentage,
       lg.grade_letter,
       lg.attendance_score,
       lg.homework_score,
       lg.activity_score,
       lg.total_daily_coin,
       se.session_date,
       se.start_time,
       se.end_time,
       c.class_id,
       c.class_name,
       t.teacher_id,
       t.first_name AS teacher_first_name,
       t.last_name AS teacher_last_name,
       lr.rank,
       lr.total_students,
       COALESCE(lc.coins_given, lg.total_daily_coin, 0)::int AS coins_given
     FROM latest_grade lg
     JOIN sessions se ON se.session_id = lg.session_id
     LEFT JOIN classes c ON c.class_id = lg.class_id
     LEFT JOIN teachers t ON t.teacher_id = lg.teacher_id
     LEFT JOIN lesson_rank lr ON lr.student_id = lg.student_id
     LEFT JOIN lesson_coins lc ON TRUE`,
    [studentId]
  );
  return result.rows[0] || null;
};

const classRank = async (centerId: number, classId: number) => {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1 AND class_id = $2
       GROUP BY student_id
     )
     SELECT
       s.student_id,
       s.first_name,
       s.last_name,
       s.status,
       s.coins,
       COALESCE(p.points, 0) AS points,
       RANK() OVER (
         ORDER BY COALESCE(s.coins, 0) DESC,
                  COALESCE(p.points, 0) DESC,
                  s.student_id ASC
       )::int AS rank
     FROM students s
     LEFT JOIN points p ON p.student_id = s.student_id
     WHERE s.center_id = $1
       AND s.class_id = $2
       AND s.deleted_at IS NULL
     ORDER BY rank, s.last_name, s.first_name`,
    [centerId, classId]
  );
  return result.rows;
};

const classRankSummary = async (centerId: number, classId: number, studentId: number) => {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1 AND class_id = $2
       GROUP BY student_id
     ),
     ranked AS (
       SELECT
         s.student_id,
         s.coins,
         COALESCE(p.points, 0) AS points,
         RANK() OVER (
           ORDER BY COALESCE(s.coins, 0) DESC,
                    COALESCE(p.points, 0) DESC,
                    s.student_id ASC
         )::int AS rank,
         COUNT(*) OVER ()::int AS total_students
       FROM students s
       LEFT JOIN points p ON p.student_id = s.student_id
       WHERE s.center_id = $1
         AND s.class_id = $2
         AND s.deleted_at IS NULL
     )
     SELECT * FROM ranked WHERE student_id = $3`,
    [centerId, classId, studentId]
  );
  return result.rows[0] || null;
};

const centerRank = async (centerId: number, limit = 100) => {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1
       GROUP BY student_id
     )
     SELECT
       s.student_id,
       s.first_name,
       s.last_name,
       s.status,
       s.class_id,
       c.class_name,
       s.coins,
       COALESCE(p.points, 0) AS points,
       RANK() OVER (
         ORDER BY COALESCE(s.coins, 0) DESC,
                  COALESCE(p.points, 0) DESC,
                  s.student_id ASC
       )::int AS rank
     FROM students s
     LEFT JOIN classes c ON c.class_id = s.class_id
     LEFT JOIN points p ON p.student_id = s.student_id
     WHERE s.center_id = $1
       AND s.deleted_at IS NULL
     ORDER BY rank, s.last_name, s.first_name
     LIMIT $2`,
    [centerId, limit]
  );
  return result.rows;
};

const centerRankSummary = async (centerId: number, studentId: number) => {
  const result = await pool.query(
    `WITH points AS (
       SELECT student_id, COALESCE(SUM(marks_obtained), 0)::numeric AS points
       FROM grades
       WHERE center_id = $1
       GROUP BY student_id
     ),
     ranked AS (
       SELECT
         s.student_id,
         s.class_id,
         c.class_name,
         s.coins,
         COALESCE(p.points, 0) AS points,
         RANK() OVER (
           ORDER BY COALESCE(s.coins, 0) DESC,
                    COALESCE(p.points, 0) DESC,
                    s.student_id ASC
         )::int AS rank,
         COUNT(*) OVER ()::int AS total_students
       FROM students s
       LEFT JOIN classes c ON c.class_id = s.class_id
       LEFT JOIN points p ON p.student_id = s.student_id
       WHERE s.center_id = $1
         AND s.deleted_at IS NULL
     )
     SELECT * FROM ranked WHERE student_id = $2`,
    [centerId, studentId]
  );
  return result.rows[0] || null;
};

const results = async (studentId: number, page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const params = [studentId, limit, offset];
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT
         g.grade_id,
         g.session_id,
         g.subject,
         g.marks_obtained,
         g.total_marks,
         g.percentage,
         g.grade_letter,
         g.attendance_score,
         g.homework_score,
         g.activity_score,
         g.total_daily_coin,
         g.created_at,
         se.session_date,
         se.start_time,
         c.class_name,
         t.first_name AS teacher_first_name,
         t.last_name AS teacher_last_name
       FROM grades g
       LEFT JOIN sessions se ON se.session_id = g.session_id
       LEFT JOIN classes c ON c.class_id = g.class_id
       LEFT JOIN teachers t ON t.teacher_id = g.teacher_id
       WHERE g.student_id = $1
       ORDER BY se.session_date DESC NULLS LAST, se.start_time DESC NULLS LAST, g.grade_id DESC
       LIMIT $2 OFFSET $3`,
      params
    ),
    pool.query('SELECT COUNT(*)::int AS total FROM grades WHERE student_id = $1', [studentId]),
  ]);
  return { data: rows.rows, total: Number(count.rows[0]?.total || 0), page, limit };
};

const payments = async (studentId: number, centerId: number, page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const params = [studentId, centerId, limit, offset];
  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT
         payment_id,
         payment_date,
         amount,
         currency,
         payment_method,
         payment_status,
         payment_type,
         receipt_number,
         final_amount,
         discount_amount,
         is_complete
       FROM payments
       WHERE student_id = $1
         AND center_id = $2
         AND deleted_at IS NULL
       ORDER BY payment_date DESC, payment_id DESC
       LIMIT $3 OFFSET $4`,
      params
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total
       FROM payments
       WHERE student_id = $1
         AND center_id = $2
         AND deleted_at IS NULL`,
      [studentId, centerId]
    ),
  ]);
  return { data: rows.rows, total: Number(count.rows[0]?.total || 0), page, limit };
};

module.exports = {
  resolveStudent,
  findLastLesson,
  classRank,
  classRankSummary,
  centerRank,
  centerRankSummary,
  results,
  payments,
};

export {};
