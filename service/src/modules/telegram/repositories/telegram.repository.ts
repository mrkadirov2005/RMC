const pool = require('../../../db/pool');

// Everything one lesson's message needs, per student record in the lesson: scores, attendance
// and its reason, the lesson's coins and the child's coin balance across all their groups.
const findSessionResults = async (sessionId: number) => {
  const result = await pool.query(
    `SELECT g.student_id,
            COALESCE(s.main_student_id, s.student_id) AS main_student_id,
            s.first_name, s.last_name, s.center_id,
            g.class_id, c.class_name, ses.session_date::text AS session_date,
            g.attendance_score, g.homework_score, g.activity_score, g.points_score,
            g.total_marks, g.grade_letter,
            (SELECT string_agg(DISTINCT sub.subject_name, ', ') FROM subjects sub WHERE sub.class_id = g.class_id) AS subject_name,
            ec.center_name,
            a.status AS attendance_status, a.remarks AS attendance_remarks,
            (SELECT t.delta FROM student_coin_transactions t
              WHERE t.student_id = g.student_id AND t.source_type = 'lesson_session' AND t.source_id = g.session_id
              LIMIT 1) AS coins_delta,
            (SELECT COALESCE(SUM(linked.coins), 0) FROM students linked
              WHERE linked.deleted_at IS NULL
                AND COALESCE(linked.main_student_id, linked.student_id) = COALESCE(s.main_student_id, s.student_id)) AS coins_balance
     FROM grades g
     JOIN students s ON s.student_id = g.student_id
     LEFT JOIN classes c ON c.class_id = g.class_id
     LEFT JOIN sessions ses ON ses.session_id = g.session_id
     LEFT JOIN attendance a ON a.student_id = g.student_id AND a.session_id = g.session_id
     LEFT JOIN edu_centers ec ON ec.center_id = s.center_id
     WHERE g.session_id = $1`,
    [sessionId]
  );
  return result.rows;
};

/** Each lesson score of the month, for ranking a group and the whole center. */
const findMonthScores = async ({ centerId, monthStart, monthEnd }: { centerId: number; monthStart: string; monthEnd: string }) => {
  const result = await pool.query(
    `SELECT g.class_id, COALESCE(s.main_student_id, s.student_id) AS main_student_id,
            g.attendance_score, g.homework_score, g.activity_score, g.points_score
     FROM grades g
     JOIN students s ON s.student_id = g.student_id AND s.deleted_at IS NULL
     JOIN sessions ses ON ses.session_id = g.session_id
     WHERE g.center_id = $1 AND ses.session_date >= $2::date AND ses.session_date < $3::date`,
    [centerId, monthStart, monthEnd]
  );
  return result.rows;
};

/** Children (main records) that have at least one chat following them. */
const findLinkedStudentIds = async (studentIds: number[]) => {
  if (studentIds.length === 0) return new Set<number>();
  const result = await pool.query(
    'SELECT DISTINCT student_id FROM telegram_links WHERE active AND student_id = ANY($1::int[])',
    [studentIds]
  );
  return new Set<number>(result.rows.map((row: any) => Number(row.student_id)));
};

/**
 * Every chat following these children, with whether it's the student or a parent and, for a
 * parent, their name: from their parents record (matched by phone), else the parent name saved on
 * the child when the chat's phone is the saved parent phone.
 */
const findLinkedChats = async (studentIds: number[]) => {
  if (studentIds.length === 0) return [];
  const result = await pool.query(
    `SELECT DISTINCT ON (l.telegram_chat_id, l.student_id)
            l.student_id, l.telegram_chat_id, l.role,
            COALESCE(
              (SELECT NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), '')
               FROM parents p
               JOIN parent_students ps ON ps.parent_id = p.parent_id AND ps.student_id = l.student_id
               WHERE RIGHT(regexp_replace(COALESCE(p.phone, ''), '\\D', '', 'g'), 9) = RIGHT(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g'), 9)
               ORDER BY p.parent_id LIMIT 1),
              CASE WHEN RIGHT(regexp_replace(COALESCE(s.parent_phone, ''), '\\D', '', 'g'), 9) = RIGHT(regexp_replace(COALESCE(l.phone, ''), '\\D', '', 'g'), 9)
                   THEN NULLIF(trim(s.parent_name), '') END
            ) AS parent_name
     FROM telegram_links l
     JOIN students s ON s.student_id = l.student_id
     WHERE l.active AND l.student_id = ANY($1::int[])
     ORDER BY l.telegram_chat_id, l.student_id, l.updated_at DESC`,
    [studentIds]
  );
  return result.rows;
};

const enqueueMessages = async (rows: Array<{ centerId: number | null; studentId: number; kind: string; text: string; createdById?: number | null; createdByType?: string | null; telegramChatId?: number | string | null }>) => {
  if (rows.length === 0) return 0;
  const values: any[] = [];
  const tuples = rows.map((row, index) => {
    values.push(row.centerId, row.studentId, row.kind, row.text, row.createdById ?? null, row.createdByType ?? null, row.telegramChatId ?? null);
    const base = index * 7;
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`;
  });
  await pool.query(
    `INSERT INTO telegram_outbox (center_id, student_id, kind, text, created_by_id, created_by_type, telegram_chat_id) VALUES ${tuples.join(', ')}`,
    values
  );
  return rows.length;
};

/** The child's main record id, name and center, for any of their records. */
const findStudent = async (studentId: number) => {
  const result = await pool.query(
    `SELECT s.student_id, COALESCE(s.main_student_id, s.student_id) AS main_student_id, s.first_name, s.last_name, s.center_id, s.class_id
     FROM students s WHERE s.student_id = $1 AND s.deleted_at IS NULL`,
    [studentId]
  );
  return result.rows[0] || null;
};

const findInbox = async ({ centerId, teacherId, kinds }: { centerId?: number; teacherId?: number; kinds?: string[] }) => {
  const result = await pool.query(
    `SELECT i.inbox_id, i.kind, i.text, i.is_read, i.created_at, i.sender_role, i.sender_name,
            i.student_id, NULLIF(trim(concat_ws(' ', s.last_name, s.first_name)), '') AS student_name,
            i.teacher_id, NULLIF(trim(concat_ws(' ', t.first_name, t.last_name)), '') AS teacher_name
     FROM telegram_inbox i
     LEFT JOIN students s ON s.student_id = i.student_id
     LEFT JOIN teachers t ON t.teacher_id = i.teacher_id
     WHERE ($1::int IS NULL OR i.center_id = $1)
       AND ($2::int IS NULL OR i.teacher_id = $2)
       AND ($3::text[] IS NULL OR i.kind = ANY($3::text[]))
     ORDER BY i.created_at DESC
     LIMIT 200`,
    [centerId ?? null, teacherId ?? null, kinds && kinds.length ? kinds : null]
  );
  return result.rows;
};

const markInboxRead = async (inboxId: number, { centerId, teacherId }: { centerId?: number; teacherId?: number }) => {
  const result = await pool.query(
    `UPDATE telegram_inbox SET is_read = true
     WHERE inbox_id = $1 AND ($2::int IS NULL OR center_id = $2) AND ($3::int IS NULL OR teacher_id = $3)
     RETURNING inbox_id`,
    [inboxId, centerId ?? null, teacherId ?? null]
  );
  return result.rows[0] || null;
};

const countLinks = async (centerId?: number) => {
  const result = await pool.query(
    `SELECT role, COUNT(DISTINCT student_id)::int AS students, COUNT(*)::int AS chats
     FROM telegram_links WHERE active AND ($1::int IS NULL OR center_id = $1) GROUP BY role`,
    [centerId ?? null]
  );
  return result.rows;
};

const findTeacherName = async (teacherId: number) => {
  const result = await pool.query(
    `SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '') AS name FROM teachers WHERE teacher_id = $1`,
    [teacherId]
  );
  return result.rows[0]?.name || null;
};

module.exports = { findTeacherName, findSessionResults, findMonthScores, findLinkedStudentIds, findLinkedChats, enqueueMessages, findStudent, findInbox, markInboxRead, countLinks };

export {};
